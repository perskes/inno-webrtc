
var innovaphone = innovaphone || {};
innovaphone.widget = innovaphone.widget || {};
innovaphone.widget.pathPrefix = innovaphone.widget.pathPrefix || "";
innovaphone.widget.SideBarWidget = innovaphone.widget.SideBarWidget || (function () {

  function _SideBarWidget() {

      var rootElement = document.createElement("div");
      rootElement.classList.add('innovaphone-root');
      document.body.appendChild(rootElement);  
      /*
       * Selectors
       */
      instance = this;
      instance.widgetWrapper      = document.querySelector('.innovaphone-root');
      instance.endpoint           = null;
      instance.connection         = null;
      instance.activity           = null;
      instance.supporters         = [];
      instance.currentSupporter   = null;
      instance.call               = null;

      /*
       * Default options
       */
      var defaults = {
          urlPbx: "wss://pbx.example.com/PBX0/WEBSOCKET/websocket",
          urlAuth: "https://www.example.com/WidgetAuth.php",
          pathPrefix: "",
          username: null,
          password: null,
          device: null,
          physicalLocation: null,
          regContext: "0",

          image: 'dummy2.jpg',
          companyName: 'Company',
          companyStreet: 'Address 1',
          companyCity: 'Address 2',
          companyTel: '+01 123 / 12345 - 0',
          companyFax: '+01 123 / 12345 - 9',
          companyEmail: 'info@example.com',
          video: false,

          translations: {
        	  available: "Available",
        	  unavailable: "Not available",
        	  call: "Call",
        	  videocall: "Videocall",
        	  email: "Email",
        	  confirm: "By leaving this website, your connection will be terminated. Please use the right click to open a new tab.",
        	  unsupported: "Your Browser does not support WebRTC"
          },
      
          status: {
              available: {text: 'Verfügbar', className: 'available', active: true}, 
              away: {text: 'Abwesend', className: 'not-available', active: false}, 
              lunch: {text: 'Beim Essen', className: 'not-available', active: false}, 
              vacation: {text: 'Im Urlaub', className: 'not-available', active: false}, 
              busy: {text: 'Beschäftigt', className: 'offline', active: false}, 
              dnd: {text: 'Nicht stören', className: 'offline', active: false},
              closed: {text: 'Offline', className: 'offline', active: false}
          }
      };

      /*
       * Check if arguments are passed at widget initialization.
       * If not use default options
       */
      if (arguments[0] && typeof arguments[0] === "object") {
          instance.options = instance.extendDefaultsSidebar(defaults, arguments[0]);
      }else{
          instance.options = defaults;
      }

      /*
       * Set event listener
       */
      instance.widgetWrapper.addEventListener('click', instance.open);
      
      /*
       * Init!
       */
      instance.initSidebar.call(instance);
  };

  /*
   * ============================================
   *  Public methods
   * ============================================
   * 
   */
   _SideBarWidget.prototype.open = function(e){
      if(instance.call) return;
      this.classList.toggle('innovaphone-root--open');
  };

  _SideBarWidget.prototype.makeCall = function(name, phone, video){
      var rootElement = document.querySelector('.innovaphone-root');
      rootElement.classList.add('innovaphone-root--open');
      rootElement.classList.remove('innovaphone-root--vis');
      instance.initCall(name, phone, video, instance.endpoint);
  };

  /*
   * ============================================  
   * Private methods
   * ============================================
   * 
   */
  

  /*
   * Load innovaphone webrtc
   */
   _SideBarWidget.prototype.initSidebar = function(){
      innovaphone.pbxwebsocket.PathPrefix = instance.options.pathPrefix;
      var WebRtcEndpoint  = innovaphone.pbxwebsocket.WebRtc.Endpoint;
      var Connection      = innovaphone.pbxwebsocket.Connection;

      if (instance.endpoint) instance.endpoint.close();
      instance.endpoint = new WebRtcEndpoint(instance.options.urlPbx, instance.options.username, instance.options.password, instance.options.device, instance.options.physicalLocation, instance.options.regContext, logFunction, instance.onCall.bind(instance), instance.onAuthenticateWebRtc);

      if (instance.connection) instance.connection.close();
      instance.connection = new Connection(instance.options.urlPbx, instance.options.username, instance.options.password);
      instance.connection.onauthenticate      = instance.onAuthenticate;
      instance.connection.onconnected         = instance.onConnected.bind(instance);
      instance.connection.onerror             = instance.onError.bind(instance);
      instance.connection.onclosed            = instance.onClosed.bind(instance);
      instance.connection.onendpointpresence  = instance.onEndpointPresence.bind(instance);
  }


    /*
     * Extend default options with options passed as 
     * arguments at widget initialization
     */
  _SideBarWidget.prototype.getXmlTagSidebar = function(xml, tag){
    var from, to = null;
    from = xml.search("<"+tag+">")+tag.length+2;
    to = xml.search("</"+tag+">");
    return xml.substring(from, to);
  }

  _SideBarWidget.prototype.onAuthenticateWebRtc = function(realm, sessionId, serverNonce) {
        var xmlHttp = new XMLHttpRequest();

        if (xmlHttp) {
            xmlHttp.open('GET', instance.options.urlAuth + '?SID=' + sessionId+'&SNO='+serverNonce, true);
            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState == 4) {
                    var xmlDoc = xmlHttp.responseText;
                    var username = instance.getXmlTagSidebar(xmlDoc, "username");
                    var clientNonce = parseInt(instance.getXmlTagSidebar(xmlDoc, "clientNonce"));
                    var digest =  instance.getXmlTagSidebar(xmlDoc, "digest");
                    instance.endpoint.setAuthentication(username, clientNonce, digest);
               }
            };
            xmlHttp.send(null);
        }
    }
    
  _SideBarWidget.prototype.onAuthenticate = function(realm, sessionId, serverNonce) {
      var xmlHttp = new XMLHttpRequest();

      if (xmlHttp) {
          xmlHttp.open('GET', instance.options.urlAuth + '?SID=' + sessionId+'&SNO='+serverNonce, true);
          xmlHttp.onreadystatechange = function () {
              if (xmlHttp.readyState == 4) {
                  var xmlDoc = xmlHttp.responseText;
                  var username = instance.getXmlTagSidebar(xmlDoc, "username");
                  var clientNonce = parseInt(instance.getXmlTagSidebar(xmlDoc, "clientNonce"));
                  var digest = instance.getXmlTagSidebar(xmlDoc, "digest");
                  instance.connection.setAuthentication(username, clientNonce, digest);
             }
          };
          xmlHttp.send(null);
      }
  }  


  _SideBarWidget.prototype.extendDefaultsSidebar = function(source, properties) {
      var property;
      for (property in properties) {
          if (properties.hasOwnProperty(property)) {
              source[property] = properties[property];
          }
      }
      return source;
  }

  function logFunction(text) {
      console.log("WebRtcEndpoint: " + text);
  }

  _SideBarWidget.prototype.onConnected = function(userInfo) {
        for(var i=0; i<instance.options.supporters.length; i++){
            instance.connection.sendSubscribeEndpoint(instance.options.supporters[i].shortcut, null);
        }
    }

    _SideBarWidget.prototype.onError = function(error) {
        console.log("Error: " + error);
    }

    _SideBarWidget.prototype.onClosed = function() {
    }


    _SideBarWidget.prototype.onCall = function(event, call) {
        instance.call = call;
        instance.activity = instance.options.status['available'];  

        /*
         * Change view to active view with big supporter image
         * Add close call event to active phone icon
         */
        if(event==='updated' && call.state !== 'disconnecting'){
            instance.createActiveCallViewSidebar.call(instance);

            var activeIcon = document.querySelector('#iconActiveCall');
            activeIcon.onclick = function(e) {
                instance.clearCall.call(instance, call.id);
                instance.createWidgetSidebar.call(instance, instance.currentSupporter);
            }
            instance.endpoint.attachVideo(document.querySelector("#innovaphone-widget-video-local"), document.querySelector("#innovaphone-widget-video-remote"));
        }

        /*
         * Close call, remove active view and redraw standard widget
         */
        if(event==='removed' || call.state == "disconnected") {
            instance.createWidgetSidebar.call(instance, instance.currentSupporter);

            /*
             * Select phone icon
             */
            var phone     = document.querySelector('#iconCall');
            var videoIcon = document.querySelector('#iconVideo');
            phone.onclick = function(e){
                e.stopPropagation();
                instance.makeCall(instance.currentSupporter.shortcut, instance.currentSupporter.phone, false, instance.endpoint);
            }
            videoIcon.onclick = function(e) {
                e.stopPropagation();
                instance.makeCall(instance.currentSupporter.shortcut, instance.currentSupporter.phone, true);
            }
            instance.call = null;

        }
    }

    _SideBarWidget.prototype.close = function() {
        if (instance.connection) instance.connection.close();
        instance.connection = null;
    }

    _SideBarWidget.prototype.initCall = function(name, number, video, endpoint) {
        if (endpoint) endpoint.initCall(name, number, video, endpoint);
    }

    _SideBarWidget.prototype.clearCall = function(id) {
        if (instance.endpoint) instance.endpoint.clearCall(id);
    }

    /*
     * Method is called on supporter's status change
     */
    _SideBarWidget.prototype.onEndpointPresence = function(name, number, phoneStatus, imStatus, activity, note) {
        if(instance.call) return;
        /*
         * Set supporters status globally
         */
        instance.updateSupporterStatusSidebar(name, phoneStatus, imStatus, activity, note);

        var activeSupporter     = 0;
        var lastSupporter       = instance.supporters[0];

        /*
         * Check status of all supporters
         */
        instance.supporters.forEach(function(supporter){
            if(supporter.imStatus === "open" && supporter.activity === '') {
                activeSupporter++;
                instance.currentSupporter = supporter;
            }
        });

        if(activeSupporter!==0) {
            var activity  = (instance.currentSupporter.activity==='') ? 'available' : instance.currentSupporter.activity;
            instance.activity = instance.options.status[activity];
            instance.createWidgetSidebar.call(instance, instance.currentSupporter);

            
            /*
             * Add event listener AFTER view was created
             */
            var phoneIcon = document.querySelector('#iconCall');
            var videoIcon = document.querySelector('#iconVideo');
    
            phoneIcon.onclick = function(e) {
                e.stopPropagation();
                instance.makeCall(instance.currentSupporter.shortcut, instance.currentSupporter.phone, false); 
            }
            videoIcon.onclick = function(e) {
                e.stopPropagation();
                instance.makeCall(instance.currentSupporter.shortcut, instance.currentSupporter.phone, true);
            }
        }else{
            if(!lastSupporter) return;

            
            /*
             * Show widget with last supporter if none is available
             */
            var activity  = (lastSupporter.activity==='' || lastSupporter.activity==='on-the-phone') ? 'closed' : lastSupporter.activity;
            instance.activity = instance.options.status[activity];
            instance.createWidgetSidebar.call(instance, lastSupporter);
        }

        /*
         * If no WebRTC is supported
         */
        if (!innovaphone.pbxwebsocket.WebRtc.supported) {
            var tooltips = document.querySelectorAll('.innovaphone-tooltip');
            document.querySelector('#iconCall').classList.remove('available');
            document.querySelector('#iconVideo').classList.remove('available');
            tooltips[0].innerHTML = instance.options.translations.unsupported;
            tooltips[0].classList.add('innovaphone-tooltip--smaller');
            tooltips[1].innerHTML = instance.options.translations.unsupported;
            tooltips[1].classList.add('innovaphone-tooltip--smaller');
        }
    }

    /*
     * Add status properties to global supporters object
     */
     _SideBarWidget.prototype.updateSupporterStatusSidebar = function(nameKey, phoneStatus, imStatus, activity, note) {
        instance.supporters = instance.options.supporters;
        for (var i=0; i < instance.supporters.length; i++) {
            if (instance.supporters[i].shortcut === nameKey) {
                instance.supporters[i].phoneStatus = phoneStatus;
                instance.supporters[i].imStatus    = imStatus;
                instance.supporters[i].activity    = activity;
                instance.supporters[i].note        = note;

                return instance.supporters[i];
            }
        }
    }

    /*
     * Create markup for HTML widget
     */
     _SideBarWidget.prototype.createWidgetSidebar = function(supporter) {     

        instance.widgetWrapper.innerHTML = '';
        var status = (supporter.imStatus === "open" && supporter.activity === '') ? instance.options.translations.available : instance.options.translations.unavailable;

        var view = '<div class="innovaphone-tab">'+
                '<img src="'+supporter.img+'" class="innovaphone-tab__supporter-img '+instance.activity.className+'" alt="">'+
                '<div class="innovaphone-icons">'+
                     '<a href="#" class="innovaphone-icons__item '+instance.activity.className+'" id="iconCall" >'+
                          '<div class="innovaphone-tooltip">'+instance.options.translations.call+'</div>'+
                          '<img src="' + instance.options.pathPrefix + 'innovaphone.widget.phone.svg" alt="">' +
                     '</a>'+
                     '<a href="#" class="innovaphone-icons__item '+instance.activity.className+'" id="iconVideo">'+
                          '<div class="innovaphone-tooltip">'+instance.options.translations.videocall+'</div>'+
                          '<img src="' + instance.options.pathPrefix + 'innovaphone.widget.video.svg" alt="">' +
                     '</a>'+
                     '<a href="mailto:'+supporter.email+'" class="innovaphone-icons__item innovaphone-icons__item--mail" id="iconMail">'+
                          '<div class="innovaphone-tooltip">'+instance.options.translations.email+'</div>'+
                          '<img src="' + instance.options.pathPrefix + 'innovaphone.widget.mail.svg" alt="">' +
                     '</a>'+
                '</div>'+
           '</div>'+
           '<div class="innovaphone-content">'+
                '<div class="innovaphone-content__headline"><strong>'+supporter.name+'</strong> | '+supporter.department+'</div>'+
                '<div class="innovaphone-content__status"><div class="innovaphone-content__status__indicator '+instance.activity.className+'"></div> '+status+'</div>'+
                '<div class="innovaphone-content__address">'+
                     '<address>'+
                          '<strong>'+instance.options.companyName+'</strong><br><br>'+
                          instance.options.companyStreet+'<br>'+
                          instance.options.companyCity+'<br><br>'+
                          'Tel. '+instance.options.companyTel+'<br>'+
                          'Fax. '+instance.options.companyFax+'<br><br>'+
                          '<a href="mailto:'+instance.options.companyEmail+'">'+instance.options.companyEmail+'</a>'+
                     '</address>'+
                '</div>'+
                '<div class="innovaphone-copy">Powered by <a href="https://www.innovaphone.com">innovaphone</a></div>'+
           '</div>'+
           '<img src="' + instance.options.pathPrefix + 'innovaphone.widget.arrow.svg" class="innovaphone-back" alt="">';

        instance.widgetWrapper.innerHTML = view;

        document.querySelector('#iconCall').addEventListener('mouseover', instance.addOverflow);
        document.querySelector('#iconVideo').addEventListener('mouseover', instance.addOverflow);
        document.querySelector('#iconMail').addEventListener('mouseover', instance.addOverflow);
        document.querySelector('#iconCall').addEventListener('mouseout', instance.removeOverflow);
        document.querySelector('#iconVideo').addEventListener('mouseout', instance.removeOverflow);
        document.querySelector('#iconMail').addEventListener('mouseout', instance.removeOverflow);
    }

    /*
     * Create markup for active call layer
     */
     _SideBarWidget.prototype.createActiveCallViewSidebar = function() {
        var view = '<div class="innovaphone-active-layer clearfix">'+
                        '<video id="innovaphone-widget-video-remote" muted="muted"></video>'+
                        '<video id="innovaphone-widget-video-local" muted="muted"></video>'+
                        '<div class="innovaphone-active-img"><img src="'+instance.currentSupporter.img+'"></div>'+
                        '<a href="#" class="innovaphone-icons__item '+instance.activity.className+'" id="iconActiveCall" >'+
                            '<img src="' + instance.options.pathPrefix + 'innovaphone.widget.phone.svg" alt="">' +
                        '</a>'+
                        '<div class="innovaphone-active-layer__name">'+instance.currentSupporter.name+'</div>'+
                    '</div>';

        instance.widgetWrapper.innerHTML = view;
    }

    _SideBarWidget.prototype.addOverflow = function() {
        if(!instance.widgetWrapper.classList.contains('innovaphone-root--open')) return;
        instance.widgetWrapper.classList.add('innovaphone-root--vis');
    }

    _SideBarWidget.prototype.removeOverflow = function() {
        if(!instance.widgetWrapper.classList.contains('innovaphone-root--open')) return;
        instance.widgetWrapper.classList.remove('innovaphone-root--vis');
    }

    window.addEventListener("beforeunload", function (event) {
        if(!instance.call) return;
        var confirmationMessage = instance.options.translations.confirm;
        event.returnValue = confirmationMessage;
        return confirmationMessage;
    });

    // public API
    return _SideBarWidget;
})();