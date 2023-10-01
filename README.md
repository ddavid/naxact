# naxact

Extends the original POC project by network usage statistics.

TODO: 
- [ ]: Unit tests
- [ ]: Simple integration tests, especially for WS endpoints
- [ ]: Simple bootsrapping configuration via clap+serde+yaml
- [ ]: Leverage axum's `with_state` to inject system constraints, like what the network utilisation budget is for that host.
- [ ]: Feedback mechanisms for controlling what effects the network utilisation being too high
  - [ ]: Can we leverage a simple RL algorithm here?

## Forked from

### axact

A resource monitor in your browser, so you can view the state of a VM or
some other remote host. Built with Rust & Preact, see the video:

https://youtu.be/c_5Jy_AVDaM

https://github.com/fasterthanlime/axact

## License

This project is primarily distributed under the terms of both the MIT license
and the Apache License (Version 2.0).

See [LICENSE-APACHE](LICENSE-APACHE) and [LICENSE-MIT](LICENSE-MIT) for details.