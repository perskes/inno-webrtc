var innovaphone = innovaphone || {};
innovaphone.widget = innovaphone.widget || {};
innovaphone.widget.pathPrefix = innovaphone.widget.pathPrefix || "";
innovaphone.widget.CardWidget = innovaphone.widget.CardWidget || (function () {

    function _CardWidget() {
        /*
         * Selectors
         */
        instanceVisitenkarten = this;
        instanceVisitenkarten.widgetWrapper = document.querySelector('#supporters-card-container');
        instanceVisitenkarten.endpoint = null;
        instanceVisitenkarten.connection = null;
        instanceVisitenkarten.activity = null;
        instanceVisitenkarten.supporters = [];
        instanceVisitenkarten.currentSupporter = null;
        instanceVisitenkarten.call = null;

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

            image: 'dummy.jpg',
            companyName: 'Company',
            companyStreet: 'Address 1',
            companyCity: 'Address 2',
            companyTrunk: '+01 123 / 12345 - 0',
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
                unsupported: "Your Browser does not support WebRTC",
                enterdtmf: "Please enter the DTMF digits"
            },

            status: {
                available: {
                    text: 'Verfügbar',
                    className: 'available',
                    active: true
                },
                away: {
                    text: 'Abwesend',
                    className: 'not-available',
                    active: false
                },
                lunch: {
                    text: 'Beim Essen',
                    className: 'not-available',
                    active: false
                },
                vacation: {
                    text: 'Im Urlaub',
                    className: 'not-available',
                    active: false
                },
                busy: {
                    text: 'Beschäftigt',
                    className: 'offline',
                    active: false
                },
                dnd: {
                    text: 'Nicht stören',
                    className: 'offline',
                    active: false
                },
                closed: {
                    text: 'Offline',
                    className: 'offline',
                    active: false
                }
            }
        };

        /*
         * Check if arguments are passed at widget initialization.
         * If not use default options
         */
        if (arguments[0] && typeof arguments[0] === "object") {
            instanceVisitenkarten.options = extendDefaults(defaults, arguments[0]);
        } else {
            instanceVisitenkarten.options = defaults;
        }

        /*
         * Init!
         */
        init.call(instanceVisitenkarten);
    };

    /*
     * ============================================
     *  Public methods
     * ============================================
     * 
     */
    _CardWidget.prototype.prepareCall = function (clickedCardClass, clickedCardIndex, shortcut, phone, video) {
        instanceVisitenkarten.currentSupporter = instanceVisitenkarten.supporters[clickedCardIndex];
        instanceVisitenkarten.clickedCardClass = clickedCardClass;
        instanceVisitenkarten.options.video = video;
        initCall(shortcut, phone, video, instanceVisitenkarten.endpoint);
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
    function init() {
        innovaphone.pbxwebsocket.PathPrefix = instanceVisitenkarten.options.pathPrefix;
        var WebRtcEndpoint = innovaphone.pbxwebsocket.WebRtc.Endpoint;
        var Connection = innovaphone.pbxwebsocket.Connection;

        if (instanceVisitenkarten.endpoint) instanceVisitenkarten.endpoint.close();
        instanceVisitenkarten.endpoint = new WebRtcEndpoint(instanceVisitenkarten.options.urlPbx, instanceVisitenkarten.options.username, instanceVisitenkarten.options.password, instanceVisitenkarten.options.device, instanceVisitenkarten.options.physicalLocation, instanceVisitenkarten.options.regContext, logFunction, onCall.bind(instanceVisitenkarten), instanceVisitenkarten.onAuthenticateWebRtc);

        if (instanceVisitenkarten.connection) instanceVisitenkarten.connection.close();
        instanceVisitenkarten.connection = new Connection(instanceVisitenkarten.options.urlPbx, instanceVisitenkarten.options.username, instanceVisitenkarten.options.password);
        instanceVisitenkarten.connection.onauthenticate = instanceVisitenkarten.onAuthenticate;
        instanceVisitenkarten.connection.onconnected = onConnected.bind(instanceVisitenkarten);
        instanceVisitenkarten.connection.onerror = onError.bind(instanceVisitenkarten);
        instanceVisitenkarten.connection.onclosed = onClosed.bind(instanceVisitenkarten);
        instanceVisitenkarten.connection.onendpointpresence = onEndpointPresence.bind(instanceVisitenkarten);
    }


    /*
     * AUTHENTICATION
     */
    function getXmlTag(xml, tag) {
        var from, to = null;
        from = xml.search("<" + tag + ">") + tag.length + 2;
        to = xml.search("</" + tag + ">");
        return xml.substring(from, to);
    }

    _CardWidget.prototype.onAuthenticateWebRtc = function (realm, sessionId, serverNonce) {
        var xmlHttp = new XMLHttpRequest();

        if (xmlHttp) {
            xmlHttp.open('GET', instanceVisitenkarten.options.urlAuth + '?SID=' + sessionId + '&SNO=' + serverNonce, true);
            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState == 4) {
                    var xmlDoc = xmlHttp.responseText;
                    var username = getXmlTag(xmlDoc, "username");
                    var clientNonce = parseInt(getXmlTag(xmlDoc, "clientNonce"));
                    var digest = getXmlTag(xmlDoc, "digest");
                    instanceVisitenkarten.endpoint.setAuthentication(username, clientNonce, digest);
                }
            };
            xmlHttp.send(null);
        }
    }

    _CardWidget.prototype.onAuthenticate = function (realm, sessionId, serverNonce) {
        var xmlHttp = new XMLHttpRequest();

        if (xmlHttp) {
            xmlHttp.open('GET', instanceVisitenkarten.options.urlAuth + '?SID=' + sessionId + '&SNO=' + serverNonce, true);
            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState == 4) {
                    var xmlDoc = xmlHttp.responseText;
                    var username = getXmlTag(xmlDoc, "username");
                    var clientNonce = parseInt(getXmlTag(xmlDoc, "clientNonce"));
                    var digest = getXmlTag(xmlDoc, "digest");
                    instanceVisitenkarten.connection.setAuthentication(username, clientNonce, digest);
                }
            };
            xmlHttp.send(null);
        }
    }

    /*
     * Extend default options with options passed as 
     * arguments at widget initialization
     */
    function extendDefaults(source, properties) {
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

    function onConnected(userInfo) {
        for (var i = 0; i < instanceVisitenkarten.options.supporters.length; i++) {
            instanceVisitenkarten.connection.sendSubscribeEndpoint(instanceVisitenkarten.options.supporters[i].shortcut, null);
        }
    }

    function onError(error) {
        console.log("Error: " + error);
        console.log(error);
    }

    function onClosed() {
        // console.log("Closed");
    }

    function onCall(event, call) {
        instanceVisitenkarten.call = call;
        instanceVisitenkarten.activity = instanceVisitenkarten.options.status['available'];

        /*
         * Change view to active view with big supporter image
         * Add close call event to active phone icon
         */
        if (event === 'updated' && call.state !== 'disconnecting') {
            createActiveCallView.call(instanceVisitenkarten);

            var videoElementLocal = document.querySelector('#innovaphone-widget-video-local');
            videoElementLocal.style.display = (instanceVisitenkarten.options.video) ? 'block' : 'none';

            var activeIcon = document.querySelector('#iconActiveCall');
            activeIcon.onclick = function (e) {
                clearCall.call(instanceVisitenkarten, call.id);
                createWidget.call(instanceVisitenkarten, instanceVisitenkarten.currentSupporter);
            }

            var keypadIcon = document.querySelector('#iconKeypad');
            keypadIcon.onclick = function (e) {
                var dtmfDigits = prompt(instanceVisitenkarten.options.translations.enterdtmf, "");
                dtmfCall.call(instanceVisitenkarten, call.id, dtmfDigits);
            }

            instanceVisitenkarten.endpoint.attachVideo(document.querySelector("#innovaphone-widget-video-local"), document.querySelector("#innovaphone-widget-video-remote"));

        }

        /*
         * Close call, remove active view and redraw standard widget
         */
        if (event === 'removed' || call.state == "disconnected") {
            createWidget.call(instanceVisitenkarten, instanceVisitenkarten.currentSupporter);
            instanceVisitenkarten.call = null;

        }
    }

    function close() {
        if (instanceVisitenkarten.connection) instanceVisitenkarten.connection.close();
        instanceVisitenkarten.connection = null;
    }

    function initCall(name, number, video, endpoint) {
        if (endpoint) endpoint.initCall(name, number, video, endpoint);
    }

    function clearCall(id) {
        if (instanceVisitenkarten.endpoint) instanceVisitenkarten.endpoint.clearCall(id);
    }

    function dtmfCall(id, digits) {
        if (instanceVisitenkarten.endpoint) instanceVisitenkarten.endpoint.dtmfCall(id, digits);
    }

    /*
     * Method is called on supporter's status change
     */
    function onEndpointPresence(name, number, phoneStatus, imStatus, activity, note) {
        /*
         * Set supporters status globally
         */
        updateSupporterStatus(name, phoneStatus, imStatus, activity, note);

        if (instanceVisitenkarten.call) return;
        var activeSupporter = 0;
        var lastSupporter = instanceVisitenkarten.supporters[0];

        createWidget.call(instanceVisitenkarten, instanceVisitenkarten.supporters);

        /*
         * If no WebRTC is supported
         */
        if (!innovaphone.pbxwebsocket.WebRtc.supported) {
            var tooltips = document.querySelectorAll('.innovaphone-tooltip');
            document.querySelector('.iconCall').classList.remove('available');
            document.querySelector('.iconVideo').classList.remove('available');
            tooltips[0].innerHTML = instanceVisitenkarten.options.translations.unsupported;
            tooltips[0].classList.add('innovaphone-tooltip--smaller');
            tooltips[1].innerHTML = instanceVisitenkarten.options.translations.unsupported;
            tooltips[1].classList.add('innovaphone-tooltip--smaller');
        }
    }

    /*
     * Add status properties to global supporters object
     */
    function updateSupporterStatus(nameKey, phoneStatus, imStatus, activity, note) {
        instanceVisitenkarten.supporters = instanceVisitenkarten.options.supporters;
        for (var i = 0; i < instanceVisitenkarten.supporters.length; i++) {
            if (instanceVisitenkarten.supporters[i].shortcut === nameKey) {
                instanceVisitenkarten.supporters[i].phoneStatus = phoneStatus;
                instanceVisitenkarten.supporters[i].imStatus = imStatus;
                instanceVisitenkarten.supporters[i].activity = activity;
                instanceVisitenkarten.supporters[i].note = note;

                // set current supporter
                instanceVisitenkarten.currentSupporter = instanceVisitenkarten.supporters[i];

                return instanceVisitenkarten.supporters[i];
            }
        }
    }

    /*
     * Create markup for HTML widget
     */
    function createWidget(supporters) {
        instanceVisitenkarten.widgetWrapper = document.querySelector('#supporters-card-container');
        instanceVisitenkarten.widgetWrapper.innerHTML = '';

        var view = '';
        instanceVisitenkarten.supporters = instanceVisitenkarten.options.supporters;
        for (var i = 0; i < instanceVisitenkarten.supporters.length; i++) {
            var supporter = instanceVisitenkarten.supporters[i];
            var clickedCardClass = 'card-' + i;
            var status = (supporter.imStatus === "open" && supporter.activity === '') ? instanceVisitenkarten.options.translations.available : instanceVisitenkarten.options.translations.unavailable;
            var statusClass = (supporter.imStatus === "open" && supporter.activity === '') ? 'available' : 'offline';
            var activity = (supporter.imStatus === "open" && supporter.activity === '') ? 'available' : 'closed'; // MW 25.02.2016: fixed
            var phoneClick = (activity == 'available') ? 'onclick="instanceVisitenkarten.prepareCall(\'' + clickedCardClass + '\', ' + i + ', \'' + supporter.shortcut + '\', \'' + supporter.phone + '\', false)"' : '';
            var videoClick = (activity == 'available') ? 'onclick="instanceVisitenkarten.prepareCall(\'' + clickedCardClass + '\', ' + i + ', \'' + supporter.shortcut + '\', \'' + supporter.phone + '\', true)"' : '';

            view += '<div class="innovaphone-root-visitenkarten ' + clickedCardClass + '">' +
                '<div class="innovaphone-image">' +
                '<img src="' + supporter.img + '" class="innovaphone-tab__supporter-img ' + statusClass + '" alt="">' +
                '</div>' +
                '<div class="innovaphone-content">' +
                '<div class="innovaphone-content__headline">' +
                '<strong>' + supporter.name + ' <br> ' + supporter.department + '</strong>' +
                '</div>' +
                '<div class="innovaphone-content__status">' +
                '<div class="innovaphone-content__status__indicator ' + statusClass + '"></div> ' + status +
                '</div>' +
                '<div class="innovaphone-content__address">' +
                '<address><strong>' + instanceVisitenkarten.options.companyName + '</strong><br>' + instanceVisitenkarten.options.companyStreet + '<br>' + instanceVisitenkarten.options.companyCity + '<br><br>Tel. ' + instanceVisitenkarten.options.companyTrunk + ' - ' + supporter.phone + '<br><a href="mailto:' + supporter.email + '">' + supporter.email + '</a></address>' +
                '</div>' +
                '</div>' +
                '<div class="innovaphone-tab">' +
                '<div class="innovaphone-icons">' +
                '<div><a href="#" class="iconCall innovaphone-icons__item ' + activity + '" ' + phoneClick + '>' +
                '<div class="innovaphone-tooltip">' + instanceVisitenkarten.options.translations.call + '</div>' +
                '<img src="' + instanceVisitenkarten.options.pathPrefix + 'innovaphone.widget.phone.svg" alt="">' +
                '</a>' +
                '</div>' +
                '<div><a href="#" class="innovaphone-icons__item iconVideo ' + activity + '" ' + videoClick + '>' +
                '<div class="innovaphone-tooltip">' + instanceVisitenkarten.options.translations.videocall + '</div>' +
                '<img src="' + instanceVisitenkarten.options.pathPrefix + 'innovaphone.widget.video.svg" alt="">' +
                '</a>' +
                '</div>' +
                '<div><a href="mailto:' + supporter.email + '" class="innovaphone-icons__item innovaphone-icons__item--mail">' +
                '<div class="innovaphone-tooltip">' + instanceVisitenkarten.options.translations.email + '</div>' +
                '<img src="' + instanceVisitenkarten.options.pathPrefix + 'innovaphone.widget.mail.svg" alt="">' +
                '</a>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="innovaphone-copy">' +
                'Powered by <a href="https://www.innovaphone.com">innovaphone</a>' +
                '</div>' +
                '</div>';
        }

        instanceVisitenkarten.widgetWrapper.innerHTML = view;
    }

    /*
     * Create markup for active call layer
     */
    function createActiveCallView() {
        var view = '<div class="innovaphone-active-layer clearfix">' +
            '<video id="innovaphone-widget-video-remote" muted="muted"></video>' +
            '<video id="innovaphone-widget-video-local" muted="muted"></video>' +
            '<div class="innovaphone-active-img"><img src="' + instanceVisitenkarten.currentSupporter.img + '"></div>' +
            '<div class="innovaphone-tab">' +
            '<div class="innovaphone-icons">' +
            '<div>' +
            '<a href="#" class="innovaphone-icons__item ' + instanceVisitenkarten.activity.className + '" id="iconActiveCall" >' +
            '<img src="' + instanceVisitenkarten.options.pathPrefix + 'innovaphone.widget.phone.svg" alt="">' +
            '</a>' +
            '</div>' +
            '<div>' +
            '<a href="#" class="innovaphone-icons__item ' + instanceVisitenkarten.activity.className + '" id="iconKeypad" >' +
            '<img class="open" src="' + instanceVisitenkarten.options.pathPrefix + 'innovaphone.widget.keypad.svg" alt="">' +
            '</a>' +
            '</div>' +
            '</div>' +
            '<div class="innovaphone-active-layer__supporter">' +
            '<div class="innovaphone-active-layer__name"><strong>' + instanceVisitenkarten.currentSupporter.name + '</strong></div>' +
            '<div class="innovaphone-active-layer__department">' + instanceVisitenkarten.options.companyName + ' | ' + instanceVisitenkarten.currentSupporter.department + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="innovaphone-copy">' +
            'Powered by <a href="https://www.innovaphone.com">innovaphone</a>' +
            '</div>' +
            '</div>';

        instanceVisitenkarten.widgetWrapper = document.querySelector('.' + instanceVisitenkarten.clickedCardClass);
        instanceVisitenkarten.widgetWrapper.innerHTML = view;
    }

    window.addEventListener("beforeunload", function (event) {
        if (!instanceVisitenkarten.call) return;
        var confirmationMessage = instanceVisitenkarten.options.translations.confirm;
        event.returnValue = confirmationMessage;
        return confirmationMessage;
    });

    // public API
    return _CardWidget;
})();
