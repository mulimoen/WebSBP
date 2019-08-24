# What is it?

This is a test at combining rust+WASM+WebGL. The prototype can be seen [here](https://ulimoen.dev/physics/maxwell). It is currently solving the 2D Maxwell equations in homogenous media.

# Building
Run `make_wasm.py` or `make_wasm.py -r` for the release version.

# Running
After building, a http server needs to serve the contents. WASM requires this server to serve .wasm as application/wasm.
