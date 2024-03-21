const utils = {
    makeURL(url, params) {
        if (!Array.isArray(params)) {
            throw new Error("params must be an array")
        }
        const API_URL = new URL(url);
        API_URL.searchParams.set("addressdetails", "1")
        API_URL.searchParams.set("format", "jsonv2")
        API_URL.searchParams.set("limit", "1")
        params.forEach(({ key, value }) => API_URL.searchParams.set(key, value))
        return API_URL;
    }
}
module.exports = utils;