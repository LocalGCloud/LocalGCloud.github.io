#!/bin/sh

set -eu

PROGRAM=localcloud
ALIAS=lc
DEFAULT_RELEASE_ROOT=https://github.com/LocalGCloud/localcloud-cli/releases
MANAGED_MARKER=.localcloud-script-install
PATH_BLOCK_START='# >>> LocalCloud installer >>>'
PATH_BLOCK_END='# <<< LocalCloud installer <<<'
MANUAL_URL=https://local.cloud/docs/#manual-docker-path

requested_version=
install_dir=${LOCALCLOUD_INSTALL_DIR:-}
modify_path=1
start_after_install=1
uninstall=0
temporary_dir=
pending_install=
pending_marker=
pending_runtime=
backup_install=
backup_marker=
installed_runtime=
installed_launcher=0
installed_marker=0
created_alias=

usage() {
    cat <<'USAGE'
Install the LocalCloud CLI.

Usage:
  install.sh [options]
  install.sh --uninstall [--install-dir PATH]

Options:
  --version X.Y.Z       Install one semantic version instead of latest
  --install-dir PATH    Install into PATH (default: $HOME/.local/bin)
  --no-start            Do not offer to run doctor and start
  --no-modify-path      Do not update a shell startup file
  --uninstall           Remove only the script-managed CLI and PATH block
  --help                Show this help

Environment:
  LOCALCLOUD_INSTALL_DIR       Automation default for --install-dir
  LOCALCLOUD_RELEASE_BASE_URL  Release-root override for mirrors and tests
USAGE
}

fail() {
    message=$1
    recovery=$2
    printf 'error: %s\n' "$message" >&2
    printf 'next: %s\n' "$recovery" >&2
    exit 1
}

cleanup() {
    if [ -n "$pending_install" ] && [ -e "$pending_install" ]; then
        rm -f "$pending_install"
    fi
    if [ -n "$pending_marker" ] && [ -e "$pending_marker" ]; then
        rm -f "$pending_marker"
    fi
    if [ "$installed_marker" -eq 1 ] && [ -n "${marker_destination:-}" ]; then
        if [ -n "$backup_marker" ] && [ -f "$backup_marker" ]; then
            mv -f "$backup_marker" "$marker_destination" 2>/dev/null || true
            backup_marker=
        else
            rm -f "$marker_destination"
        fi
    fi
    if [ -n "$backup_marker" ] && [ -e "$backup_marker" ]; then
        rm -f "$backup_marker"
    fi
    if [ -n "$pending_runtime" ] && [ -d "$pending_runtime" ]; then
        rm -rf "$pending_runtime"
    fi
    if [ "$installed_launcher" -eq 1 ] && [ -n "${destination:-}" ]; then
        if [ -n "$backup_install" ] && [ -f "$backup_install" ]; then
            mv -f "$backup_install" "$destination" 2>/dev/null || true
            backup_install=
        else
            rm -f "$destination"
        fi
    fi
    if [ -n "$backup_install" ] && [ -e "$backup_install" ]; then
        rm -f "$backup_install"
    fi
    if [ -n "$installed_runtime" ] && [ -d "$installed_runtime" ]; then
        rm -rf "$installed_runtime"
    fi
    if [ -n "$created_alias" ] && [ -L "$created_alias" ]; then
        cleanup_alias_target=$(readlink "$created_alias" 2>/dev/null || true)
        if [ "$cleanup_alias_target" = "$PROGRAM" ]; then
            rm -f "$created_alias"
        fi
    fi
    if [ -n "$temporary_dir" ] && [ -d "$temporary_dir" ]; then
        rm -rf "$temporary_dir"
    fi
}
trap cleanup 0
trap 'exit 1' HUP INT TERM

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail \
        "required command '$1' was not found" \
        "Install $1, then rerun the LocalCloud installer."
}

semantic_version() {
    case $1 in
        ''|*[!0-9.]*|.*|*.|*..*) return 1 ;;
    esac
    major=${1%%.*}
    remaining=${1#*.}
    [ "$remaining" != "$1" ] || return 1
    minor=${remaining%%.*}
    patch=${remaining#*.}
    [ "$patch" != "$remaining" ] || return 1
    case $patch in
        *.*) return 1 ;;
    esac
    for part in "$major" "$minor" "$patch"; do
        case $part in
            ''|*[!0-9]*) return 1 ;;
        esac
    done
}

shell_quote() {
    printf "'"
    printf '%s' "$1" | sed "s/'/'\\\\''/g"
    printf "'"
}

managed_marker_path() {
    printf '%s/%s\n' "$install_dir" "$MANAGED_MARKER"
}

is_managed_marker_file() {
    marker_file=$1
    [ -f "$marker_file" ] && [ ! -L "$marker_file" ] || return 1
    first_line=
    IFS= read -r first_line < "$marker_file" || true
    [ "$first_line" = 'managed-by=localcloud-install.sh' ]
}

is_managed_install() {
    is_managed_marker_file "$(managed_marker_path)"
}

alias_destination_path() {
    printf '%s/%s\n' "$install_dir" "$ALIAS"
}

marker_records_alias() {
    is_managed_install || return 1
    marker=$(managed_marker_path)
    marker_line=
    while IFS= read -r marker_line || [ -n "$marker_line" ]; do
        [ "$marker_line" = "alias=$ALIAS" ] && return 0
    done < "$marker"
    return 1
}

runtime_name_from_marker() {
    marker=$1
    marker_line=
    while IFS= read -r marker_line || [ -n "$marker_line" ]; do
        case $marker_line in
            runtime=.localcloud-runtime-*)
                runtime_name_value=${marker_line#runtime=}
                runtime_version=${runtime_name_value#.localcloud-runtime-}
                semantic_version "$runtime_version" || return 1
                [ "$runtime_name_value" = ".localcloud-runtime-$runtime_version" ] ||
                    return 1
                printf '%s\n' "$runtime_name_value"
                return 0
                ;;
        esac
    done < "$marker"
    return 1
}

managed_runtime_name() {
    is_managed_install || return 1
    runtime_name_from_marker "$(managed_marker_path)"
}

archive_entry_allowed() {
    entry=$1
    case $entry in
        /* | .. | ../* | */../* | */..) return 1 ;;
    esac
    case $entry in
        LICENSE | THIRD_PARTY_NOTICES | localcloud | localcloud-runtime/ | localcloud-runtime/*)
            return 0
            ;;
        *) return 1 ;;
    esac
}

is_localcloud_alias() {
    alias_destination=$(alias_destination_path)
    [ -L "$alias_destination" ] || return 1
    alias_target=$(readlink "$alias_destination" 2>/dev/null || true)
    [ "$alias_target" = "$PROGRAM" ]
}

remove_path_block() {
    shell_file=$1
    [ -f "$shell_file" ] || return 0
    scratch="${shell_file}.localcloud.$$"
    if ! sed "/^${PATH_BLOCK_START}$/,/^${PATH_BLOCK_END}$/d" "$shell_file" > "$scratch"; then
        rm -f "$scratch"
        fail \
            "could not update $shell_file" \
            "Remove the marked LocalCloud PATH block from $shell_file manually."
    fi
    if ! cat "$scratch" > "$shell_file"; then
        rm -f "$scratch"
        fail \
            "could not update $shell_file" \
            "Remove the marked LocalCloud PATH block from $shell_file manually."
    fi
    rm -f "$scratch"
}

select_shell_file() {
    case ${SHELL##*/} in
        zsh) printf '%s/.zshrc\n' "$HOME" ;;
        bash) printf '%s/.bashrc\n' "$HOME" ;;
        *) printf '%s/.profile\n' "$HOME" ;;
    esac
}

append_path_block() {
    shell_file=$(select_shell_file)
    remove_path_block "$shell_file"
    quoted_dir=$(shell_quote "$install_dir")
    {
        printf '\n%s\n' "$PATH_BLOCK_START"
        printf '%s\n' "export PATH=$quoted_dir:\"\$PATH\""
        printf '%s\n' "$PATH_BLOCK_END"
    } >> "$shell_file" || fail \
        "could not append the LocalCloud PATH block to $shell_file" \
        "Run export PATH=$(shell_quote "$install_dir"):\\\"\\$PATH\\\" in this terminal."
    printf '%s\n' "$shell_file"
}

homebrew_binary() {
    resolved=$(command -v "$PROGRAM" 2>/dev/null || true)
    [ -n "$resolved" ] || return 1
    command -v brew >/dev/null 2>&1 || return 1
    prefix=$(brew --prefix 2>/dev/null || true)
    [ -n "$prefix" ] || return 1
    case $resolved in
        "$prefix"/*) return 0 ;;
        *) return 1 ;;
    esac
}

uninstall_cli() {
    if homebrew_binary; then
        fail \
            "localcloud resolves to a Homebrew installation" \
            "Run brew uninstall localcloud."
    fi

    destination=$install_dir/$PROGRAM
    alias_destination=$(alias_destination_path)
    if is_managed_install; then
        runtime_name=$(managed_runtime_name || true)
        alias_was_managed=0
        if marker_records_alias; then
            alias_was_managed=1
        fi
        if [ "$alias_was_managed" -eq 1 ]; then
            if is_localcloud_alias; then
                rm -f "$alias_destination" || fail \
                    "could not remove the script-managed LocalCloud alias" \
                    "Remove $alias_destination manually."
                printf 'Removed LocalCloud alias %s -> %s.\n' "$ALIAS" "$PROGRAM"
            elif [ -e "$alias_destination" ] || [ -L "$alias_destination" ]; then
                printf 'warning: Preserved %s because it no longer matches the managed %s -> %s symlink.\n' \
                    "$alias_destination" "$ALIAS" "$PROGRAM" >&2
            else
                printf 'Managed LocalCloud alias %s is already absent.\n' "$alias_destination"
            fi
        elif [ -e "$alias_destination" ] || [ -L "$alias_destination" ]; then
            printf 'warning: Preserved %s because it is not managed by LocalCloud.\n' \
                "$alias_destination" >&2
        fi
        if [ -n "$runtime_name" ]; then
            runtime_destination=$install_dir/$runtime_name
            if [ -d "$runtime_destination" ] && [ ! -L "$runtime_destination" ]; then
                rm -rf "$runtime_destination" || fail \
                    "could not remove the script-managed LocalCloud runtime" \
                    "Remove $runtime_destination manually."
            elif [ -e "$runtime_destination" ] || [ -L "$runtime_destination" ]; then
                printf 'warning: Preserved %s because it is not the managed runtime directory.\n' \
                    "$runtime_destination" >&2
            fi
        fi
        rm -f "$destination" "$(managed_marker_path)" || fail \
            "could not remove the script-managed LocalCloud CLI" \
            "Remove $destination and $(managed_marker_path) manually."
    elif [ -e "$destination" ] || [ -L "$destination" ]; then
        fail \
            "$destination is not marked as a script-managed installation" \
            "Remove it with the package manager or process that installed it."
    elif [ -e "$alias_destination" ] || [ -L "$alias_destination" ]; then
        printf 'warning: Preserved %s because it is not managed by LocalCloud.\n' \
            "$alias_destination" >&2
    fi

    remove_path_block "$HOME/.zshrc"
    remove_path_block "$HOME/.bashrc"
    remove_path_block "$HOME/.profile"
    printf 'LocalCloud CLI is uninstalled. Containers and persistent volumes remain intact.\n'
}

install_command_alias() {
    alias_destination=$(alias_destination_path)
    alias_managed=0
    alias_message=
    alias_was_managed=0
    if marker_records_alias; then
        alias_was_managed=1
    fi

    if [ -e "$alias_destination" ] || [ -L "$alias_destination" ]; then
        if [ "$alias_was_managed" -eq 1 ] && is_localcloud_alias; then
            alias_managed=1
            alias_message="LocalCloud alias $ALIAS -> $PROGRAM is already installed at $alias_destination"
        else
            printf 'warning: %s already exists and is not the managed LocalCloud alias; preserved it. Use %s for LocalCloud.\n' \
                "$alias_destination" "$PROGRAM" >&2
        fi
        return
    fi

    resolved_alias=$(command -v "$ALIAS" 2>/dev/null || true)
    if [ -n "$resolved_alias" ]; then
        printf 'warning: %s already resolves to %s; preserved it. Use %s for LocalCloud.\n' \
            "$ALIAS" "$resolved_alias" "$PROGRAM" >&2
        return
    fi

    if ! ln -s "$PROGRAM" "$alias_destination"; then
        printf 'warning: could not create %s -> %s; preserved current state. Use %s for LocalCloud.\n' \
            "$alias_destination" "$PROGRAM" "$PROGRAM" >&2
        return
    fi
    created_alias=$alias_destination
    alias_managed=1
    if [ "$alias_was_managed" -eq 1 ]; then
        alias_message="Repaired LocalCloud alias $ALIAS -> $PROGRAM at $alias_destination"
    else
        alias_message="Installed LocalCloud alias $ALIAS -> $PROGRAM at $alias_destination"
    fi
}

write_managed_marker() {
    marker_destination=$(managed_marker_path)
    pending_marker=$(mktemp "${install_dir}/.localcloud-marker.XXXXXX") || fail \
        "could not stage the managed-install marker in $install_dir" \
        "Check directory permissions and rerun the installer."
    printf 'managed-by=localcloud-install.sh\n' > "$pending_marker" || fail \
        "could not record the script-managed installation" \
        "Remove $destination and rerun the installer."
    printf 'version=%s\n' "$installed_version" >> "$pending_marker" || fail \
        "could not record the script-managed installation" \
        "Remove $destination and rerun the installer."
    printf 'sha256=%s\n' "$actual_checksum" >> "$pending_marker" || fail \
        "could not record the script-managed installation" \
        "Remove $destination and rerun the installer."
    printf 'runtime=%s\n' "$runtime_name" >> "$pending_marker" || fail \
        "could not record the script-managed installation" \
        "Remove $destination and rerun the installer."
    if [ "$alias_managed" -eq 1 ]; then
        printf 'alias=%s\n' "$ALIAS" >> "$pending_marker" || fail \
            "could not record the script-managed installation" \
            "Remove $destination and rerun the installer."
    fi
    staged_runtime=$(runtime_name_from_marker "$pending_marker" || true)
    if ! is_managed_marker_file "$pending_marker" ||
        [ "$staged_runtime" != "$runtime_name" ]; then
        fail \
            "the staged managed-install marker is invalid" \
            "Remove $destination and rerun the installer."
    fi
    if [ -e "$marker_destination" ] || [ -L "$marker_destination" ]; then
        [ -f "$marker_destination" ] && [ ! -L "$marker_destination" ] || fail \
            "the existing managed-install marker changed during installation" \
            "Inspect $marker_destination, then rerun the installer."
        backup_marker=$(mktemp "${install_dir}/.localcloud-marker-backup.XXXXXX") ||
            fail \
                "could not preserve the existing managed-install marker" \
                "Check directory permissions and rerun the installer."
        cp -p "$marker_destination" "$backup_marker" || fail \
            "could not preserve the existing managed-install marker" \
            "Check directory permissions and rerun the installer."
    fi
    mv -f "$pending_marker" "$marker_destination" || fail \
        "could not atomically record the script-managed installation" \
        "Remove $destination and rerun the installer."
    pending_marker=
    installed_marker=1
    finalized_runtime=$(runtime_name_from_marker "$marker_destination" || true)
    if ! is_managed_marker_file "$marker_destination" ||
        [ "$finalized_runtime" != "$runtime_name" ]; then
        fail \
            "the managed-install marker was not finalized correctly" \
            "Inspect $marker_destination, then rerun the installer."
    fi
}

while [ "$#" -gt 0 ]; do
    case $1 in
        --version)
            [ "$#" -ge 2 ] || fail \
                "--version requires a value" \
                "Rerun with --version X.Y.Z."
            requested_version=$2
            shift 2
            ;;
        --install-dir)
            [ "$#" -ge 2 ] || fail \
                "--install-dir requires a path" \
                "Rerun with --install-dir PATH."
            install_dir=$2
            shift 2
            ;;
        --no-start)
            start_after_install=0
            shift
            ;;
        --no-modify-path)
            modify_path=0
            shift
            ;;
        --uninstall)
            uninstall=1
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            fail \
                "unknown option '$1'" \
                "Run the installer with --help to see supported options."
            ;;
    esac
done

if [ -n "$requested_version" ] && ! semantic_version "$requested_version"; then
    fail \
        "invalid version '$requested_version'" \
        "Rerun with --version X.Y.Z, for example --version 0.1.0."
fi

if [ -z "$install_dir" ]; then
    [ -n "${HOME:-}" ] || fail \
        "HOME is not set and no install directory was provided" \
        "Set HOME or rerun with --install-dir PATH."
    install_dir=$HOME/.local/bin
fi
case $install_dir in
    '') fail "the install directory is empty" "Rerun with --install-dir PATH." ;;
esac

if [ "$uninstall" -eq 1 ]; then
    require_command readlink
    uninstall_cli
    exit 0
fi

if homebrew_binary; then
    fail \
        "localcloud already resolves to a Homebrew installation" \
        "Run brew upgrade localcloud instead."
fi

require_command curl
require_command tar
require_command sed
require_command sort
require_command mktemp
require_command chmod
require_command cp
require_command mv
require_command ln
require_command readlink
require_command find
if command -v sha256sum >/dev/null 2>&1; then
    checksum_command=sha256sum
elif command -v shasum >/dev/null 2>&1; then
    checksum_command=shasum
else
    fail \
        "neither sha256sum nor shasum is available" \
        "Install a SHA-256 utility, then rerun the LocalCloud installer."
fi

case $(uname -s 2>/dev/null || true) in
    Darwin) platform=darwin ;;
    Linux) platform=linux ;;
    *) fail \
        "this operating system is not supported by the standalone CLI" \
        "Use the manual Docker instructions at $MANUAL_URL."
       ;;
esac
case $(uname -m 2>/dev/null || true) in
    arm64|aarch64) architecture=arm64 ;;
    x86_64|amd64) architecture=amd64 ;;
    *) fail \
        "this CPU architecture is not supported by the standalone CLI" \
        "Use the manual Docker instructions at $MANUAL_URL."
       ;;
esac

asset="localcloud-${platform}-${architecture}.tar.gz"
release_root=${LOCALCLOUD_RELEASE_BASE_URL:-$DEFAULT_RELEASE_ROOT}
release_root=${release_root%/}
if [ -n "$requested_version" ]; then
    download_base="${release_root}/download/v${requested_version}"
else
    download_base="${release_root}/latest/download"
fi
archive_url="${download_base}/${asset}"
checksums_url="${download_base}/SHA256SUMS"

destination=$install_dir/$PROGRAM
if [ -e "$destination" ] || [ -L "$destination" ]; then
    is_managed_install || fail \
        "$destination exists but is not script-managed" \
        "Move it aside or choose another directory with --install-dir PATH."
fi
marker_destination=$(managed_marker_path)
if [ -e "$marker_destination" ] || [ -L "$marker_destination" ]; then
    is_managed_install || fail \
        "$marker_destination exists but is not a valid script-managed marker" \
        "Move it aside or choose another directory with --install-dir PATH."
fi

writable_parent=$install_dir
while [ ! -e "$writable_parent" ]; do
    parent=${writable_parent%/*}
    if [ "$parent" = "$writable_parent" ] || [ -z "$parent" ]; then
        writable_parent=.
        break
    fi
    writable_parent=$parent
done
[ -d "$writable_parent" ] && [ -w "$writable_parent" ] || fail \
    "install directory $install_dir is not writable" \
    "Choose a writable directory with --install-dir PATH."

temporary_dir=$(mktemp -d "${TMPDIR:-/tmp}/localcloud-install.XXXXXX") || fail \
    "could not create a temporary directory" \
    "Set TMPDIR to a writable directory and rerun the installer."
archive=$temporary_dir/$asset
checksums=$temporary_dir/SHA256SUMS
extract_dir=$temporary_dir/extract
mkdir -p "$extract_dir"

curl -fsSL "$archive_url" -o "$archive" || fail \
    "could not download $archive_url" \
    "Confirm the requested release exists at https://github.com/LocalGCloud/localcloud-cli/releases."
curl -fsSL "$checksums_url" -o "$checksums" || fail \
    "could not download $checksums_url" \
    "Confirm the requested release exists at https://github.com/LocalGCloud/localcloud-cli/releases."

expected_checksum=
while IFS=' ' read -r digest filename _; do
    filename=${filename#\*}
    if [ "$filename" = "$asset" ]; then
        expected_checksum=$digest
        break
    fi
done < "$checksums"
case $expected_checksum in
    ''|*[!0-9a-f]*) fail \
        "SHA256SUMS has no valid checksum for $asset" \
        "Download and inspect the release at https://github.com/LocalGCloud/localcloud-cli/releases."
        ;;
esac
[ "${#expected_checksum}" -eq 64 ] || fail \
    "SHA256SUMS has an invalid checksum for $asset" \
    "Download and inspect the release at https://github.com/LocalGCloud/localcloud-cli/releases."

if [ "$checksum_command" = sha256sum ]; then
    actual_checksum=$(sha256sum "$archive")
else
    actual_checksum=$(shasum -a 256 "$archive")
fi
actual_checksum=${actual_checksum%% *}
[ "$actual_checksum" = "$expected_checksum" ] || fail \
    "checksum verification failed for $asset" \
    "Delete the download and retry from https://github.com/LocalGCloud/localcloud-cli/releases."

archive_entries=$(tar -tzf "$archive" 2>/dev/null) || fail \
    "the downloaded archive could not be read" \
    "Retry the install or download the release manually."
if ! printf '%s\n' "$archive_entries" |
    while IFS= read -r archive_entry || [ -n "$archive_entry" ]; do
        archive_entry_allowed "$archive_entry" || exit 1
    done; then
    fail \
        "the downloaded archive has unexpected contents" \
        "Download and inspect the release manually before installing it."
fi
archive_listing=$(tar -tvzf "$archive" 2>/dev/null) || fail \
    "the downloaded archive metadata could not be read" \
    "Retry the install or download the release manually."
if ! printf '%s\n' "$archive_listing" |
    while IFS= read -r archive_line || [ -n "$archive_line" ]; do
        case $archive_line in
            -* | d*) ;;
            *) exit 1 ;;
        esac
    done; then
    fail \
        "the downloaded archive contains links or special files" \
        "Download and inspect the release manually before installing it."
fi
tar -xzf "$archive" -C "$extract_dir" || fail \
    "the downloaded archive could not be extracted" \
    "Retry the install or download the release manually."
[ -f "$extract_dir/localcloud" ] && [ ! -L "$extract_dir/localcloud" ] || fail \
    "the archive does not contain a regular localcloud executable" \
    "Download and inspect the release manually before installing it."
[ -z "$(find "$extract_dir" -type l -print -quit)" ] || fail \
    "the downloaded archive contains a symbolic link" \
    "Download and inspect the release manually before installing it."
[ -z "$(find "$extract_dir" -type f -links +1 -print -quit)" ] || fail \
    "the downloaded archive contains a hard-linked file" \
    "Download and inspect the release manually before installing it."
if [ ! -e "$extract_dir/localcloud-runtime" ]; then
    mkdir "$extract_dir/localcloud-runtime" || fail \
        "the legacy LocalCloud runtime could not be staged" \
        "Check permissions under ${TMPDIR:-/tmp} and rerun the installer."
    cp "$extract_dir/localcloud" "$extract_dir/localcloud-runtime/localcloud" ||
        fail \
            "the legacy LocalCloud executable could not be staged" \
            "Check permissions under ${TMPDIR:-/tmp} and rerun the installer."
fi
[ -d "$extract_dir/localcloud-runtime" ] &&
    [ ! -L "$extract_dir/localcloud-runtime" ] || fail \
    "the archive does not contain a regular LocalCloud runtime directory" \
    "Download and inspect the release manually before installing it."
[ -f "$extract_dir/localcloud-runtime/localcloud" ] &&
    [ ! -L "$extract_dir/localcloud-runtime/localcloud" ] || fail \
    "the archive does not contain a regular LocalCloud runtime executable" \
    "Download and inspect the release manually before installing it."
chmod 0755 "$extract_dir/localcloud" "$extract_dir/localcloud-runtime/localcloud" || fail \
    "the downloaded launcher or runtime could not be made executable" \
    "Check permissions under ${TMPDIR:-/tmp} and rerun the installer."

version_output=$("$extract_dir/localcloud" --version 2>/dev/null) || fail \
    "the downloaded LocalCloud executable did not run" \
    "Use the manual Docker instructions at $MANUAL_URL."
case $version_output in
    'localcloud '*) installed_version=${version_output#localcloud } ;;
    *) fail \
        "the downloaded executable returned an invalid version" \
        "Download and inspect the release manually before installing it."
       ;;
esac
semantic_version "$installed_version" || fail \
    "the downloaded executable returned an invalid semantic version" \
    "Download and inspect the release manually before installing it."
if [ -n "$requested_version" ] && [ "$installed_version" != "$requested_version" ]; then
    fail \
        "the downloaded CLI version $installed_version does not match $requested_version" \
        "Confirm the v$requested_version release assets, then retry."
fi

runtime_name=".localcloud-runtime-$installed_version"
runtime_destination=$install_dir/$runtime_name
previous_runtime=$(managed_runtime_name || true)
same_version=0
if [ -x "$destination" ] &&
    [ "$previous_runtime" = "$runtime_name" ] &&
    [ -d "$runtime_destination" ] &&
    [ ! -L "$runtime_destination" ] &&
    [ -x "$runtime_destination/localcloud" ]; then
    current_output=$("$destination" --version 2>/dev/null || true)
    if [ "$current_output" = "$version_output" ]; then
        same_version=1
    fi
fi

installed_binary=0
if [ "$same_version" -eq 0 ]; then
    mkdir -p "$install_dir" || fail \
        "could not create install directory $install_dir" \
        "Choose a writable directory with --install-dir PATH."
    if [ -e "$runtime_destination" ] || [ -L "$runtime_destination" ]; then
        fail \
            "$runtime_destination already exists and cannot be replaced safely" \
            "Move it aside, then rerun the installer."
    fi
    pending_runtime=$(mktemp -d "${install_dir}/.localcloud-runtime-stage.XXXXXX") ||
        fail \
            "could not stage the LocalCloud runtime in $install_dir" \
            "Check directory permissions and rerun the installer."
    cp -R "$extract_dir/localcloud-runtime/." "$pending_runtime/" || fail \
        "could not stage the LocalCloud runtime" \
        "Check directory permissions and rerun the installer."
    chmod 0755 "$pending_runtime/localcloud" || fail \
        "could not set runtime executable permissions" \
        "Check directory permissions and rerun the installer."
    mv "$pending_runtime" "$runtime_destination" || fail \
        "could not install the LocalCloud runtime" \
        "Check directory permissions and rerun the installer."
    pending_runtime=
    installed_runtime=$runtime_destination

    pending_install=$(mktemp "${install_dir}/.localcloud.XXXXXX") || fail \
        "could not stage the executable in $install_dir" \
        "Check directory permissions and rerun the installer."
    cat > "$pending_install" <<EOF
#!/bin/sh
set -eu
launcher_dir=\$(CDPATH= cd -P "\$(dirname "\$0")" && pwd)
runtime="\$launcher_dir/$runtime_name/localcloud"
if [ ! -x "\$runtime" ]; then
    printf 'error: LocalCloud runtime is missing or not executable: %s\\n' "\$runtime" >&2
    exit 126
fi
exec "\$runtime" "\$@"
EOF
    chmod 0755 "$pending_install" || fail \
        "could not set executable permissions" \
        "Check directory permissions and rerun the installer."
    if [ -e "$destination" ]; then
        backup_install=$(mktemp "${install_dir}/.localcloud-backup.XXXXXX") ||
            fail \
                "could not stage the existing LocalCloud launcher" \
                "Check directory permissions and rerun the installer."
        cp -p "$destination" "$backup_install" || fail \
            "could not preserve the existing LocalCloud launcher" \
            "Check directory permissions and rerun the installer."
    fi
    mv -f "$pending_install" "$destination" || fail \
        "could not atomically install $destination" \
        "Check directory permissions and rerun the installer."
    pending_install=
    installed_launcher=1
    installed_binary=1
fi

install_command_alias
write_managed_marker
installed_marker=0
created_alias=
if [ -n "$backup_marker" ]; then
    if ! rm -f "$backup_marker"; then
        printf 'warning: could not remove managed-marker backup %s.\n' \
            "$backup_marker" >&2
    fi
    backup_marker=
fi
if [ "$installed_binary" -eq 1 ]; then
    installed_launcher=0
    installed_runtime=
    if [ -n "$backup_install" ]; then
        rm -f "$backup_install"
        backup_install=
    fi
    if [ -n "$previous_runtime" ] && [ "$previous_runtime" != "$runtime_name" ]; then
        previous_runtime_destination=$install_dir/$previous_runtime
        if [ -d "$previous_runtime_destination" ] &&
            [ ! -L "$previous_runtime_destination" ]; then
            if ! rm -rf "$previous_runtime_destination"; then
                printf 'warning: could not remove previous LocalCloud runtime %s.\n' \
                    "$previous_runtime_destination" >&2
            fi
        fi
    fi
fi

if [ "$installed_binary" -eq 1 ]; then
    printf 'Installed LocalCloud CLI %s at %s\n' "$installed_version" "$destination"
else
    printf 'LocalCloud CLI %s is already installed at %s\n' "$installed_version" "$destination"
fi
if [ -n "$alias_message" ]; then
    printf '%s\n' "$alias_message"
fi
if [ "$alias_managed" -eq 1 ]; then
    printf 'lc is an alias for localcloud; both commands behave identically.\n'
    next_command=$ALIAS
else
    next_command=$PROGRAM
fi

path_ready=0
case :${PATH:-}: in
    *:"$install_dir":*) path_ready=1 ;;
esac
if [ "$path_ready" -eq 0 ]; then
    if [ "$modify_path" -eq 1 ]; then
        shell_file=$(append_path_block)
        printf 'Run this command in the current terminal:\n  source %s\n' "$(shell_quote "$shell_file")"
    else
        printf '%s\n' 'Add LocalCloud to this terminal with:' "  export PATH=$(shell_quote "$install_dir"):\"\$PATH\""
    fi
fi

if [ "$start_after_install" -eq 0 ] || [ ! -r /dev/tty ] || [ ! -w /dev/tty ] || ! (: </dev/tty >/dev/tty) 2>/dev/null; then
    printf 'Next steps:\n  %s doctor\n  %s start\n' "$next_command" "$next_command"
    exit 0
fi

printf 'Run LocalCloud doctor and start now? [Y/n] ' > /dev/tty
answer=
IFS= read -r answer < /dev/tty || answer=n
case $answer in
    ''|y|Y|yes|YES|Yes)
        if ! "$destination" doctor; then
            printf 'Docker Desktop, Colima, or Docker Engine must be running.\n' >&2
            printf 'Retry with: %s doctor && %s start\n' "$destination" "$destination" >&2
            exit 0
        fi
        start_output=$("$destination" start) || {
            printf 'LocalCloud CLI is installed, but start did not complete.\n' >&2
            printf 'Retry with: %s start\n' "$destination" >&2
            exit 0
        }
        printf '%s\n' "$start_output"
        console_url=$(printf '%s\n' "$start_output" | sed -n 's/.*"url": "\(http[^" ]*\)".*/\1/p')
        [ -n "$console_url" ] || console_url=http://localhost:24080
        printf 'LocalCloud is running at %s\n' "$console_url"
        printf '%s\n' 'Next:' "  $next_command console" "  eval \"\$($next_command env)\""
        ;;
    *)
        printf 'Next steps:\n  %s doctor\n  %s start\n' "$next_command" "$next_command"
        ;;
esac
