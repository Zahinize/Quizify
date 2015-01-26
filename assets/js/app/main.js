require.config({
  //By default load any module IDs from js/lib
  baseUrl: 'assets/js/',
  paths: {
    tplBasePath: 'app/templates/'
  }
});

require(["app/app"], function(app) {
	console.log("main.js has been loaded!");
});