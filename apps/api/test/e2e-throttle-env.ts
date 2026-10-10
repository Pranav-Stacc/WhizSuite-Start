// Must be imported before AppModule: config is validated when the module is loaded.
// Capability e2e makes hundreds of sequential calls; the default limit would throttle it.
process.env.THROTTLE_LIMIT = '100000';
