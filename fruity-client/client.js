var server = require('http').createServer();

try {
  var kinectSock = require('openni-browser')();
  kinectSock.install(server, '/skeleton');
} catch (e) {
  console.log('Kinect initialization on the server failed');
}

server.listen(process.env.PORT || 8081, function() {
  console.log('web server listening...');
});