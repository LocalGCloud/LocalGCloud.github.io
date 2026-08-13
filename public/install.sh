#!/bin/sh

set -eu

PROGRAM=localcloud
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

is_managed_install() {
    marker=$(managed_marker_path)
    [ -f "$marker" ] || return 1
    first_line=
    IFS= read -r first_line < "$marker" || true
    [ "$first_line" = 'managed-by=localcloud-install.sh' ]
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
    if is_managed_install; then
        rm -f "$destination" "$(managed_marker_path)" || fail \
            "could not remove the script-managed LocalCloud CLI" \
            "Remove $destination and $(managed_marker_path) manually."
    elif [ -e "$destination" ] || [ -L "$destination" ]; then
        fail \
            "$destination is not marked as a script-managed installation" \
            "Remove it with the package manager or process that installed it."
    fi

    remove_path_block "$HOME/.zshrc"
    remove_path_block "$HOME/.bashrc"
    remove_path_block "$HOME/.profile"
    printf 'LocalCloud CLI is uninstalled. Containers and persistent volumes remain intact.\n'
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

archive_entries=$(tar -tzf "$archive" 2>/dev/null | sort) || fail \
    "the downloaded archive could not be read" \
    "Retry the install or download the release manually."
expected_entries=$(printf '%s\n' LICENSE THIRD_PARTY_NOTICES localcloud | sort)
[ "$archive_entries" = "$expected_entries" ] || fail \
    "the downloaded archive has unexpected contents" \
    "Download and inspect the release manually before installing it."
tar -xzf "$archive" -C "$extract_dir" || fail \
    "the downloaded archive could not be extracted" \
    "Retry the install or download the release manually."
[ -f "$extract_dir/localcloud" ] && [ ! -L "$extract_dir/localcloud" ] || fail \
    "the archive does not contain a regular localcloud executable" \
    "Download and inspect the release manually before installing it."
chmod 0755 "$extract_dir/localcloud" || fail \
    "the downloaded executable could not be made runnable" \
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

same_version=0
if [ -x "$destination" ] && is_managed_install; then
    current_output=$("$destination" --version 2>/dev/null || true)
    if [ "$current_output" = "$version_output" ]; then
        same_version=1
    fi
fi

if [ "$same_version" -eq 0 ]; then
    mkdir -p "$install_dir" || fail \
        "could not create install directory $install_dir" \
        "Choose a writable directory with --install-dir PATH."
    pending_install=$(mktemp "${install_dir}/.localcloud.XXXXXX") || fail \
        "could not stage the executable in $install_dir" \
        "Check directory permissions and rerun the installer."
    cp "$extract_dir/localcloud" "$pending_install" || fail \
        "could not stage the LocalCloud executable" \
        "Check directory permissions and rerun the installer."
    chmod 0755 "$pending_install" || fail \
        "could not set executable permissions" \
        "Check directory permissions and rerun the installer."
    mv -f "$pending_install" "$destination" || fail \
        "could not atomically install $destination" \
        "Check directory permissions and rerun the installer."
    pending_install=
    {
        printf 'managed-by=localcloud-install.sh\n'
        printf 'version=%s\n' "$installed_version"
        printf 'sha256=%s\n' "$actual_checksum"
    } > "$(managed_marker_path)" || fail \
        "could not record the script-managed installation" \
        "Remove $destination and rerun the installer."
    printf 'Installed LocalCloud CLI %s at %s\n' "$installed_version" "$destination"
else
    printf 'LocalCloud CLI %s is already installed at %s\n' "$installed_version" "$destination"
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

if [ "$start_after_install" -eq 0 ] || [ ! -r /dev/tty ] || [ ! -w /dev/tty ]; then
    printf 'Next steps:\n  %s doctor\n  %s start\n' "$destination" "$destination"
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
        printf '%s\n' 'Next:' '  localcloud console' "  eval \"\$(localcloud env)\""
        ;;
    *)
        printf 'Next steps:\n  %s doctor\n  %s start\n' "$destination" "$destination"
        ;;
esac
