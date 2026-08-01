# Docker Volume Update

**Date:** August 1, 2026  
**Status:** ✅ Complete

## Change Summary

Updated all Docker run commands to use Docker named volumes instead of host directories for better portability and Docker best practices.

## Changes Made

### Before:
```bash
mkdir -p ~/.localcloud/data
docker run -d --name localcloud \
  -v ~/.localcloud/data:/var/lib/localcloud \
  ...
```

### After:
```bash
docker volume create localcloud-data
docker run -d --name localcloud \
  -v localcloud-data:/var/lib/localcloud \
  ...
```

## Benefits

1. **Platform-independent** - Works consistently across macOS, Linux, and Windows
2. **No path issues** - No need to worry about home directory expansion or permissions
3. **Better Docker integration** - Volumes can be managed with `docker volume` commands
4. **Easier cleanup** - `docker volume rm localcloud-data` removes all data
5. **Docker Compose friendly** - Named volumes work seamlessly in compose files

## Files Updated

- ✅ `src/components/HomepageVariationFieldManual.astro`
- ✅ `src/pages/how-to-run-google-cloud-locally.astro`
- ✅ `src/pages/local-cloud-development.astro`
- ✅ `src/pages/bigquery-emulator.astro`
- ✅ `src/pages/docs/index.mdx`
- ✅ `src/pages/docs/seed-data.mdx`
- ✅ `src/data/agenticFacts.ts`

## Complete Docker Command (Updated)

```bash
# Create persistent volume (one-time)
docker volume create localcloud-data

# Run LocalCloud
docker run -d --name localcloud \
  -p 24080:24080 -p 24081:24081 -p 24082:24082 -p 24083:24083 \
  -p 24084:24084 -p 24085:24085 -p 24086:24086 -p 24087:24087 -p 24088:24088 \
  -p 24089:24089 \
  -m 4g \
  -v localcloud-data:/var/lib/localcloud \
  jaysen2apache/localcloud
```

## Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect localcloud-data

# Remove volume (when no longer needed)
docker volume rm localcloud-data

# Backup volume
docker run --rm -v localcloud-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/localcloud-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v localcloud-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/localcloud-backup.tar.gz -C /data
```

## Verification

✅ Build successful  
✅ All Docker commands updated  
✅ Homepage verified  
✅ All pillar pages verified  
✅ Documentation pages verified  

## Compatibility

This change aligns with the LocalCloud project's official documentation which uses Docker volumes.
