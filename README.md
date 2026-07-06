> [!WARNING]
>
> ## Make Backups!
>
> ### This fork includes book support and is currently in testing
>
> ### Requires you to enter a personal API key in the settings page, dont include Bearer
>
> #### If coming from jellyseerr, just copy your config over
>
> #### If coming from overseerr, please do the following:
>
> 1. Install and run the official Jellyseerr release
> 2. Using the `db` folder and `settings.json` file follow the instructions on [seerr-database-migration tool](https://github.com/pixelhunterX/seerr-database-migration) to migrate
> 3. Copy the generated `db` folder and `settings.json` file from the migration tool to this fork
>
> #### Be aware that once used with this fork, your database wont be compatible with the official jellyseerr without intervention
>
> #### Tested using [bookshelf](https://github.com/pennydreadful/bookshelf) with the hardcover tag
>
> #### Planning to add Chaptarr support once in beta
>
> #### Note: Image caching is forced for hardcover

## Immediate book availability

This book-support branch is based on the official Seerr **v3.5.0** release.
Bookshelf can notify Seerr as soon as an ebook or audiobook is imported. Seerr
then reads the book's current state from that Bookshelf server, marks the correct
format available, and completes its approved requests.

For **each** Bookshelf server:

1. Enable **Sync** on its Readarr entry in Seerr's service settings.
2. In Bookshelf, open **Settings → Connect → Add → Webhook**.
3. Set the URL to `http://seerr:5055/api/v1/webhook/readarr/<serverId>`, replacing
   `<serverId>` with that entry's numeric `id` from Seerr's `GET /api/v1/settings/readarr`.
   Use a Seerr address reachable from Bookshelf; include any configured proxy base path.
4. Select **POST**, use username `seerr`, and use the **Seerr API key** as the password.
5. Enable **On Release Import** and **On Upgrade**, then test and save.

Configure ebook and audiobook instances separately with their corresponding
server IDs. A connection test makes no library changes. Repeated import/upgrade
events are safe; incomplete imports stay processing. Scheduled scans remain a
fallback for missed notifications and older library items.

<p align="center">
<img src="./public/logo_full.svg" alt="Seerr" style="margin: 20px 0;">
</p>
<p align="center">
<img src="https://github.com/seerr-team/seerr/actions/workflows/release.yml/badge.svg" alt="Seerr Release" />
<img src="https://github.com/seerr-team/seerr/actions/workflows/ci.yml/badge.svg" alt="Seerr CI">
</p>
<p align="center">
<a href="https://discord.gg/seerr"><img src="https://img.shields.io/discord/783137440809746482" alt="Discord"></a>
<a href="https://hub.docker.com/r/seerr/seerr"><img src="https://img.shields.io/docker/pulls/seerr/seerr" alt="Docker pulls"></a>
<a href="https://translate.seerr.dev/engage/seerr/"><img src="https://translate.seerr.dev/widget/seerr/svg-badge.svg" alt="Translation status" /></a>
<a href="https://github.com/seerr-team/seerr/blob/develop/LICENSE"><img alt="GitHub" src="https://img.shields.io/github/license/seerr-team/seerr"></a>

**Seerr** is a free and open source software application for managing requests for your media library. It integrates with the media server of your choice: [Jellyfin](https://jellyfin.org), [Plex](https://plex.tv), and [Emby](https://emby.media/). In addition, it integrates with your existing services, such as **[Sonarr](https://sonarr.tv/)**, **[Radarr](https://radarr.video/)**.

## Current Features

- Full Jellyfin/Emby/Plex integration including authentication with user import & management.
- Support for **PostgreSQL** and **SQLite** databases.
- Supports Movies, Shows and Mixed Libraries.
- Ability to change email addresses for SMTP purposes.
- Easy integration with your existing services. Currently, Seerr supports Sonarr and Radarr. More to come!
- Jellyfin/Emby/Plex library scan, to keep track of the titles which are already available.
- Customizable request system, which allows users to request individual seasons or movies in a friendly, easy-to-use interface.
- Incredibly simple request management UI. Don't dig through the app to simply approve recent requests!
- Granular permission system.
- Support for various notification agents.
- Mobile-friendly design, for when you need to approve requests on the go!
- Support for watchlisting & blocklisting media.

With more features on the way! Check out our [issue tracker](/../../issues) to see the features which have already been requested.

## Getting Started

Check out our documentation for instructions on how to install and run Seerr:

https://docs.seerr.dev/getting-started/

## Preview

<img src="./public/preview.jpg" alt="Seerr application preview" />

## Migrating from Overseerr/Jellyseerr to Seerr

Read our [release announcement](https://docs.seerr.dev/blog/seerr-release) to learn what Seerr means for Jellyseerr and Overseerr users.

Please follow our [migration guide](https://docs.seerr.dev/migration-guide) for detailed instructions on migrating from Overseerr or Jellyseerr.

## Support

- Check out the [Seerr Documentation](https://docs.seerr.dev) before asking for help. Your question might already be in the docs!
- You can get support on [Discord](https://discord.gg/seerr).
- You can ask questions in the Help category of our [GitHub Discussions](/../../discussions).
- Bug reports and feature requests can be submitted via [GitHub Issues](/../../issues).

## API Documentation

You can access the API documentation from your local Seerr install at http://localhost:5055/api-docs

## Community

You can ask questions, share ideas, and more in [GitHub Discussions](/../../discussions).

If you would like to chat with other members of our growing community, [join the Seerr Discord server](https://discord.gg/seerr)!

Our [Code of Conduct](./CODE_OF_CONDUCT.md) applies to all Seerr community channels.

## Contributing

You can help improve Seerr too! Check out our [Contribution Guide](./CONTRIBUTING.md) to get started.

## Contributors ✨

[![Contributors](https://opencollective.com/seerr/contributors.svg?width=890)](https://opencollective.com/seerr/#backers)

[![Become a Backer](https://opencollective.com/seerr/backers.svg)](https://opencollective.com/seerr/#backers)
[![Become a Sponsor](https://opencollective.com/seerr/sponsors.svg)](https://opencollective.com/seerr/#sponsors)
