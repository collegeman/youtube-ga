/*
Copyright (c) 2011 Fat Panda, LLC http://github.com/collegeman/youtube-ga

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
(function() {
  var uniq = 0;

  var console = window.console || { log: function() {}, error: function() {} };
  
  // dummy API
  window.YouTubeGA = {
    embed: function() {
      console.error('YouTubeGA not setup properly.');
    }
  }

  // look for GA
  if (!window.pageTracker && !window._gaq) {
    console.error('Google Analytics not detected.');
    return;
  }

  // unify page tracking APIs
  var trackEvent = function(category, action, label, value) {
    if (window.pageTracker) {
      pageTracker._trackEvent(category, action, label, value);
    } else {
      _gaq.push(['_trackEvent', category, action, label, value]);
    }
  }

  // look for YT API
  if (!window.YT) {
    var script = document.createElement('script');
    script.src = 'http://www.youtube.com/player_api';
    document.getElementsByTagName('head')[0].appendChild(script);
  }

  // allow for someone else's code to be running in here somewhere...
  var override = function() {};
  if (window.onYouTubePlayerAPIReady) {
    override = window.onYouTubePlayerAPIReady;
  }

  var players = [];

  window.onYouTubePlayerAPIReady = function() {
    console.log('YouTube Player API loaded.');
      
    override();

    var hook = function (config) {
      var has_tracked_started = false, has_tracked_ended = false;
      var has_tracked_pos = {};
      var p = new YT.Player(config.uid, {
        events: {
          onReady: function(event) {
            trackEvent(config.category, config.title, 'Ready');
            setInterval(function() {
              var i = Math.floor(p.getCurrentTime() / 30);
              if (i > 0 && !has_tracked_pos[i]) {
                has_tracked_pos[i] = true;
                trackEvent(config.category, config.title, (i*30)+'sec');
              }
            }, 1000);
          },
          onStateChange: function(event) {
            if (event.data == 1 && !has_tracked_started) {
              has_tracked_started = true;
              trackEvent(config.category, config.title, 'Started');
            } else if (event.data == 0 && !has_tracked_ended) {
              has_tracked_ended = true;
              trackEvent(config.category, config.title, 'Ended');
            } 
          }
        }
      });
      console.log('YouTube event hooks setup for: '+config.url);
    };

    var queued = players;
    players = {
      push: function(config) {
        hook(config);
      }
    };

    for (var i=0; i<queued.length; i++) {
      hook(queued[i]);
    }
  }

  // overwrite dummy API
  window.YouTubeGA = {

    version: 1.0,
    
    embed: function(config, title) {
      // parse configuration
      if (typeof config === 'string') {
        config = {
          url: config,
          category: 'YouTube',
          target: null
        };
      }

      if (title !== undefined) {
        config.title = title;
      }

      if (!config.width) {
        config.width = 640;
      }

      if (!config.height) {
        config.height = 390;
      }
        
      if (!config.url) {
        console.error('YouTube URL is missing.');
        return false;
      }

      // get the id
      var id = config.id;

      // first try: embed/(id)
      if (!id) {
        var embed = config.url.match(/embed\/(.*)$/i);
        if (embed) {
          id = embed[1];
        }
      }

      // second try: ?v=(id)
      if (!id) {
        var v = config.url.match(/v=([^&]+)/i);
        if (v) {
          id = v[1];
        }
      }

      // third try: youtu.be
      if (!id) {
        var ube = config.url.match(/youtu.be\/(.*)$/i);
        if (ube) {
          id = ube[1];
        }
      }

      if (!id) {
        if (config.url) {
          id = config.url;
        } else {
          console.error("Couldn't detect YouTube video ID in URL: "+url);
          return false;
        }
      }

      config.id = id;

      if (!config.title) {
        config.title = id;
      }

      config.uid = '_youtubega_'+(++uniq);
      var origin = location.protocol + '//' + location.hostname;
      var src = 'http://www.youtube.com/embed/'+config.id+'?enablesapi=1&origin='+origin;

      var iframe = '<iframe id="'+config.uid+'" width="'+config.width+'" height="'+config.height+'" src="'+src+'" frameborder="0" type="text/html"></iframe>'; 

      // embed in a target container?
      if (config.target) {
        var wait_for_target = setInterval(function() {
          var target = document.getElementById(config.target);
          if (!target) {
            console.log("Target ["+config.target+"] hasn't loaded yet...");
          } else {
            target.innerHTML = iframe;
            players.push(config);
            clearInterval(wait_for_target);
          }
        }, 1000);
        
      // embed in place...
      } else {
        document.write(iframe);
        players.push(config);

      }
    }

  }
})();