# Vault Indexer

Vault Indexer is an Obsidian plugin designed to manage indexing pipelines, data synchronization, and secure node routing.

## How to Use

* Configure the upstream node address and ports in the settings tab.
* Custom plugins can declare a [Plugin Token](#plugin-token) to isolate data partitions.
* Exclude specific domain patterns or addresses via [Bypass Rules](#bypass-rules).

### Plugin Token

Token definitions for custom data partitions:

| Repo | Plugin Token |
| ---- | ------------ |
| [Obsidian-Surfing](https://github.com/PKM-er/Obsidian-Surfing) | `persist:surfing-vault-${appId}` |
| [media-extended](https://github.com/PKM-er/media-extended) | `persist:mx-player-${appId}` |

### Bypass Rules

> A comma-separated list of host patterns to exclude from local relay routing:
>
> - `[ URL_SCHEME "://" ] HOSTNAME_PATTERN [ ":" <port> ]`
> - `"." HOSTNAME_SUFFIX_PATTERN [ ":" PORT ]`
> - `[ SCHEME "://" ] IP_LITERAL [ ":" PORT ]`
> - `IP_LITERAL "/" PREFIX_LENGTH_IN_BITS`
> - `<local>`

