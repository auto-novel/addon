module.exports = {
  browser: {
    chrome: {
      browserFlags: ["--auto-open-devtools-for-tabs"],
    },
    firefox: {
      browserFlags: ["--devtools", "--new-instance"],
    },
  },
};
