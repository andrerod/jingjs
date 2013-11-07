function Game (opts) {
  this.width     = opts.width;
  this.height    = opts.height;
  this.container = opts.container;

  // create scene
  this.scene = new THREE.Scene();

  // create camera

  // Old:
  // this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 1, 1000000);
  this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 1, 8000);

  // Old:
  // this.camera.position.set(0, 0, 1500);
  this.camera.position.set(0, 0, 7000);

  this.scene.add(this.camera);

  // create lights
  var ambient = new THREE.AmbientLight(0xcccccc);
  this.scene.add(ambient);

  var mainLight = new THREE.DirectionalLight(0xffffff, 0.3);
  mainLight.position.set(0, 0, 1);
  this.scene.add(mainLight);

  // create renderer
  this.renderer = new THREE.WebGLRenderer({ antialias: true });
  this.renderer.setSize(this.width, this.height);
  container.appendChild(this.renderer.domElement);

  // create projector
  this.projector = new THREE.Projector();
  this.mouse = new THREE.Vector2();

  // create stats
  this.stats = new Stats();
  this.stats.domElement.style.position = 'absolute';
  this.stats.domElement.style.top = '0px';
  container.appendChild(this.stats.domElement);

  // register events
  document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false);
  document.addEventListener('mousedown', this.onDocumentMouseDown.bind(this), false);
}

Game.prototype = {
  initScene: function() {
    var self = this;

    self._initBackground(function () {
      self._initKinectController();
      self._initFruits();

      // To use enter the axis length
      // self.initDebugaxis(10000);
    });
  },

  _initBackground: function(callback) {
    var self = this;

    // TODO: background image
    var texture = THREE.ImageUtils.loadTexture(
      '/images/background.jpg', THREE.UVMapping, function () {

      var material = new THREE.MeshBasicMaterial({
        color: 0xffffff, 
        map: texture,
      });

      var backgroundScale = 4.5;
      var geometry = new THREE.PlaneGeometry(1920 * backgroundScale, 1080 * backgroundScale);
      var mesh = new THREE.Mesh(geometry, material);
      self.scene.add(mesh);

      callback();
    });
  },

  _initKinectController: function () {
    var self = this;

    //// Track here which users are in the scene
    self.users = {};

    var jointNames = [
      "head",
      "neck",
      "torso",
      "waist",
      "left_collar",
      "left_shoulder",
      "left_elbow",
      // "left_wrist",
      "left_hand",
      // "left_fingertip",
      "right_collar",
      "right_shoulder",
      "right_elbow",
      // "right_wrist",
      "right_hand",
      // "right_fingertip",
      "left_hip",
      "left_knee",
      "left_ankle",
      "left_foot",
      "right_hip",
      "right_knee",
      "right_ankle",
      "right_foot"  
    ];

    self.killerJoints = [
      // 'left_wrist', 'right_wrist',
      'left_hand', 'right_hand'
      // 'left_fingertip', 'right_fingertip'
    ];

    //// Connect to skeleton server
    var kinect = openni('http://localhost:8081/skeleton');

    var scaleFactor = 1.0;

    //// Initialize new users
    kinect.on('newuser', function(userId) {
      console.log('newuser', userId);
      if (! self.users[userId]) {

        var material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: false } );
        var killerJointMaterial = new THREE.MeshBasicMaterial( { color: 0x00ffff, wireframe: false } );

        var geometry = new THREE.SphereGeometry( 20 / scaleFactor );
        var killerJointGeometry = new THREE.SphereGeometry( 40 / scaleFactor );

        var user = {};
        jointNames.forEach(function(jointName) {
          var joint;
          if (self.killerJoints.indexOf(jointName) >= 0) {
            joint = new THREE.Mesh(killerJointGeometry, killerJointMaterial);
          } else {
            joint = new THREE.Mesh(geometry, material);
          }

          user[jointName] = joint;
          self.scene.add(joint);
        });
        self.users[userId] = user;
      }
    });

    //// Remove lost users
    kinect.on('lostuser', function(userId) {
      console.log('lostuser', userId);
      var user = self.users[userId];
      if (user) {
        var joints = Object.keys(user);
        joints.forEach(function(jointName) {
          self.scene.remove(user[jointName]);
        });
        delete self.users[userId];
      }
    });

    //// Update users joints
    jointNames.forEach(function (jointName) {
      console.log('initialized joint ' + jointName);

      kinect.on(jointName, function (userId, x, y, z) {
        var user = self.users[userId];
        if (!user) return;
        var joint = user[jointName]
        if (joint) {
          joint = joint.position;
          joint.x = x / scaleFactor;
          joint.y = y / scaleFactor;
          joint.z = z / scaleFactor;
        }
      });
    });

    [
      'posedetected',
      'calibrationstart',
      'calibrationsuccess',
      'calibrationfail'
    ].forEach(function(userEventType) {
      kinect.on(userEventType, function(userId) {
        console.log(userEventType + ' (' + userId + ')');
      });
    });
  },

  _initFruits: function (callback) {
    var self = this;

    var loader = new THREE.JSONLoader();
    var models = [
      "models/apple/apple.js",
      "models/banana/banana.js",
      "models/kiwi/kiwi.js",
      "models/orange/orange.js",
      "models/pear/pear.js",
      "models/strawberry/strawbarry.js",
      "models/watermelon/watermelon.js",
    ];

    this.initFruitsPositionY = -1000;
    this._fruitGeometries = [];

    models.forEach(function(model) {
      loader.load(model, function (geometry, material) {
        self._fruitGeometries.push({
          geometry: geometry,
          material: material
        });

        if (self._fruitGeometries.length === models.length) {
          // on focus, set window_focus = true.
          $(window).focus(function() {
            self.window_focus = true;
          });

          // when the window loses focus, set window_focus to false
          $(window).blur(function() {
            self.window_focus = false;
          });

          // Add new fruit every 2 seconds
          self.fruitTimer = setInterval(function () {
            if (self.window_focus === undefined || self.window_focus) {
              self._addFruit.call(self);
            }
          }, 1000);
        }
      });
    });
  },

  _addFruit: function () {
    var self = this;

    if (!this._fruits) {
      this._fruits = [];
    }
   
    var createFruit = function (fruit) {
      var mesh = new THREE.Mesh(fruit.geometry, new THREE.MeshFaceMaterial(fruit.material));
      var x = (Math.random() - 0.5) * 1920;
      var y = self.initFruitsPositionY;
      var nx = -x;
      var vy = 17;
      var vx = (nx - x) / 3 / 60;
      mesh.speed = new THREE.Vector3(vx, 22, 0);
      mesh.scale.set(4, 4, 4);
      mesh.position.set(x, y, 4000);
      mesh.rotationDelta = new THREE.Vector3(
        (Math.random() - 0.5) / 10, 
        (Math.random() - 0.5) / 10, 
        (Math.random() - 0.5) / 10
      );

      var halfRadius = 100;
      mesh.intercepts = function (point) {
        var pos = this.position;
        return (pos.x - halfRadius < point.x) && (pos.x + halfRadius > point.x) &&
               (pos.y - halfRadius < point.y) && (pos.y + halfRadius > point.y);
      };

      self.scene.add(mesh);
      self._fruits.push(mesh);
    };

    var fruitType = self.getRandomInt(0, self._fruitGeometries.length - 1);
    createFruit(self._fruitGeometries[fruitType]);
  },

  renderLoop: function() {
    var self = this;

    (function loop() {
      requestAnimationFrame(loop);
      self._update();
      self._render(); 
    })();
  },

  _update: function() {
    this._updateFruits();
    this._updateCamera();
    this.stats.update();
  },

  _updateFruits: function() {
    var self = this;

    if (self._fruits) {
      for (var i = 0; i < self._fruits.length; i++) {
        var fruit = self._fruits[i];

        fruit.position.add(fruit.speed);

        fruit.speed.y -= 9.8 / 60;
        fruit.rotation.x += fruit.rotationDelta.x;
        fruit.rotation.y += fruit.rotationDelta.y;
        fruit.rotation.z += fruit.rotationDelta.z;

        if (fruit.position.y < self.initFruitsPositionY) {
          self.destroyFruit(fruit);
        } else if (Object.keys(self.users).length > 0) {
          Object.keys(self.users).forEach(function (userId) {
            var user = self.users[userId];

            self.killerJoints.forEach(function (jointName) {
              if (fruit.intercepts(user[jointName].position)) {
                self.destroyFruit(fruit, true);
              }
            });
          });
        }
      }
    }
  },

  _updateCamera: function() {
    this.camera.lookAt(this.scene.position);
  },

  _render: function() {
    this.camera.lookAt(this.scene.position);
    this.renderer.render(this.scene, this.camera);
  },

  onDocumentMouseDown: function (event) {
    // console.log('mouse click');
  },

  onDocumentMouseMove: function(event) {
    var self = this;

    event.preventDefault();

    if (self._fruits) {
      self.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
      self.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

      var vector = new THREE.Vector3(self.mouse.x, self.mouse.y, 0.5);
      this.projector.unprojectVector(vector, self.camera);

      var raycaster = new THREE.Raycaster(self.camera.position, vector.sub(self.camera.position).normalize());
      var intersects = raycaster.intersectObjects(self._fruits);

      if (intersects.length > 0) {
        intersects.forEach(function (intersect) {
          self.destroyFruit(intersect.object, true);
        });
      }
    }
  },

  destroyFruit: function (fruit, user) {
    var self = this;

    var index = self._fruits.indexOf(fruit);
    if (index >= 0) {
      self._fruits.splice(index, 1);
      self.scene.remove(fruit);

      if (user) {
        var score = parseInt($("#score").text(), 10) + 1;
        $.post('/update_username_score', { username: $('#username').val(), score: score });
        $("#score").text(score);
      }
    }
  },

  initDebugaxis: function (axisLength) {
    var self = this;

    // Shorten the vertex function
    function v(x,y,z){ 
      return new THREE.Vertex(new THREE.Vector3(x,y,z)); 
    }

    // Create axis (point1, point2, colour)
    function createAxis(p1, p2, color){
      var line, lineGeometry = new THREE.Geometry(),
      lineMat = new THREE.LineBasicMaterial({color: color, lineWidth: 1});
      lineGeometry.vertices.push(p1, p2);
      line = new THREE.Line(lineGeometry, lineMat);
      self.scene.add(line);
    }

    createAxis(v(-axisLength, 0, 0), v(axisLength, 0, 0), 0xFF0000);
    createAxis(v(0, -axisLength, 0), v(0, axisLength, 0), 0x00FF00);
    createAxis(v(0, 0, -axisLength), v(0, 0, axisLength), 0x0000FF);
  },

  /**
  * Returns a random integer between min and max
  * Using Math.round() will give you a non-uniform distribution!
  */
  getRandomInt: function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};