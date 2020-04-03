/*---------------------------------------------------------------------------*/
/* innovaphone.pbxwebsocket.Connection.js                                    */
/* A client for connecting to the innovaphone PBX                            */
/*---------------------------------------------------------------------------*/

/*
 * Copyright (C) 2015 innovaphone AG
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *  * Neither the name of the copyright holder nor the names of
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
 * OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

/// <reference path="../common/innovaphone.common.crypto.js" />

var innovaphone = innovaphone || {};
innovaphone.pbxwebsocket = innovaphone.pbxwebsocket || {};
innovaphone.pbxwebsocket.Connection = innovaphone.pbxwebsocket.Connection || (function () {

    // dependencies
    var sha256 = innovaphone.common.crypto.sha256;

    // Constructor
    function _Connection(url, username, password) {
        var instance = this,
            url = url,
            username = username,
            password = password,
            sessionId = null,
            realm = null,
            clientNonce = 0,
            serverNonce = 0,
            userInfo = null,
            ws = null,
            states = { "CONNECT": 1, "LOGIN1": 2, "LOGIN2": 3, "CONNECTED": 4, "CLOSED": 5 },
            state = states.CONNECT;

        // websocket callback functions
        var onopen = function () {
            if (state == states.CONNECT) {
                if (username || instance.onauthenticate) {
                    state = states.LOGIN1;
                    sendLogin();
                }
                else {
                    state = states.CONNECTED;
                    instance.onconnected({});
                }
            }
        }

        var onmessage = function (message) {
            var obj = JSON.parse(message.data);
            if (obj && obj.messageType) {
                switch (obj.messageType) {
                    case "Authenticate":
                        recvAuthenticate(obj);
                        break;
                    case "LoginResult":
                        recvLoginResult(obj);
                        break;
                    case "Redirect":
                        recvRedirect(obj);
                        break;
                    case "CreateSigResult":
                        instance.onsigcreated(obj.id, obj.error);
                        break;
                    case "PreauthChallenge":
                        instance.onpreauthchallenge(obj.authTypes, obj.challenge);
                        break;
                    case "PreauthResult":
                        instance.onpreauthresult(obj.result, obj.seed, obj.encryptedUsername, obj.encryptedPassword);
                        break;
                    case "PreauthDeleteResult":
                        instance.onpreauthdeleteresult(obj.result);
                        break;
                    case "SigDeleted":
                        instance.onsigdeleted(obj.id);
                        break;
                    case "SigChannels":
                        instance.onsigchannels(obj.id, obj.channelId, obj.command, obj.sdp ? obj.sdp : obj.channels_data, obj.iceServers, obj.media);
                        break;
                    case "SigRingOn":
                        instance.onsigringon(obj.id, obj.channelId);
                        break;
                    case "SigRingOff":
                        instance.onsigringoff(obj.id, obj.channelId);
                        break;
                    case "SigToneOn":
                        instance.onsigtoneon(obj.id, obj.channelId, obj.tone, obj.time);
                        break;
                    case "SigToneOff":
                        instance.onsigtoneoff(obj.id, obj.channelId);
                        break;
                    case "SigDtmf":
                        instance.onsigdtmf(obj.id, obj.channelId, obj.digit);
                        break;
                    case "SigCallAdded":
                        instance.onsigcalladded(obj.id, obj.call);
                        break;
                    case "SigCallRemoved":
                        instance.onsigcallremoved(obj.id, obj.call);
                        break;
                    case "SigCallUpdated":
                        instance.onsigcallupdated(obj.id, obj.call);
                        break;
                    case "EndpointPresence":
                        instance.onendpointpresence(obj.name, obj.number, obj.phoneStatus, obj.imStatus, obj.activity, obj.note);
                        break;
                    case "AppInfoResult":
                        instance.onappinfo(obj.app);
                        break;
                    case "AppGetLoginResult":
                        instance.onapplogin(obj.domain, obj.sip, obj.guid, obj.dn, obj.info, obj.digest, obj.app);
                        break;
                    default:
                        if (state == states.CONNECTED) instance.onmessage(message);
                        break;
                }

            }
        }

        var onerror = function (error) {
            close("WEBSOCKET_ERROR");
        }

        var onclose = function () {
            ws = null;
            close();
        }

        // general control functions
        var connect = function () {
            state = states.CONNECT;
            if (ws) ws.close();
            ws = new WebSocket(url);
            ws.onopen = onopen;
            ws.onmessage = onmessage;
            ws.onerror = onerror;
            ws.onclose = onclose;
        }

        var close = function (error) {
            if (state != states.CLOSED) {
                state = states.CLOSED;
                if (ws) ws.close();
                ws = null;
                if (error) instance.onerror(error);
                else instance.onclosed();
            }
        }

        // incoming messages
        var recvAuthenticate = function (obj) {
            if (obj.sessionId && obj.realm && obj.nonce) {
                if (state == states.LOGIN1) {
                    sessionId = obj.sessionId;
                    realm = obj.realm;
                    serverNonce = obj.nonce;
                    clientNonce = 0;
                    if (instance.onauthenticate) {
                        instance.onauthenticate(realm, sessionId, serverNonce);
                    }
                    else {
                        state = states.LOGIN2;
                        while (clientNonce == 0) clientNonce = Math.ceil(Math.random() * 0xffffffff);
                        var digest = sha256("innovaphonePbxWebsocket:ClientAuth:" + realm + ":" + sessionId + ":" + username + ":" + password + ":" + clientNonce + ":" + serverNonce);
                        sendLogin(obj.realm, username, clientNonce, digest);
                    }
                }
                else {
                    close(obj.lastError == "NO_LICENSE" ? "ERROR_NO_LICENSE" : "ERROR_CLIENT_AUTHENTICATION");
                }
            }
        }

        var recvLoginResult = function (obj) {
            if (obj.userInfo && obj.digest) {
                if (state == states.LOGIN2) {
                    if (instance.onauthenticate || obj.digest == sha256("innovaphonePbxWebsocket:ServerAuth:" + realm + ":" + sessionId + ":" + username + ":" + password + ":" + clientNonce + ":" + serverNonce)) {
                        state = states.CONNECTED;
                        userInfo = obj.userInfo;
                        instance.onconnected(userInfo);
                    }
                    else {
                        close("ERROR_SERVER_AUTHENTICATION");
                    }
                }
                else {
                    close("ERROR_UNEXPECTED_MESSAGE");
                }
            }
            else {
                close("ERROR_INCOMPLETE_MESSAGE");
            }
        }

        var recvRedirect = function (obj) {
            if (obj.uri && obj.digest) {
                if (state == states.LOGIN2) {
                    if (obj.digest == sha256("innovaphonePbxWebsocket:ServerAuth:" + realm + ":" + sessionId + ":" + username + ":" + password + ":" + clientNonce + ":" + serverNonce)) {
                        url = obj.url;
                        connect();
                    }
                    else {
                        close("ERROR_SERVER_AUTHENTICATION");
                    }
                }
                else {
                    close("ERROR_SERVER_AUTHENTICATION");
                }
            }
        }

        // outgoing messages
        // session
        var send = function (obj) {
            ws.send(JSON.stringify(obj));
        }
        var sendLogin = function () {
            send({ messageType: "Login" });;
        }
        var sendLogin = function (realm, username, nonce, digest) {
            send({ messageType: "Login", username: username, nonce: nonce, digest: digest });
        }

        // public interface
        this.send = function (message) {
            if (state == states.CONNECTED) send(message);
        }
        this.close = function () {
            close();
        }
        // authentication
        this.setAuthentication = function (username, nonce, digest) {
            if (state == states.LOGIN1) {
                state = states.LOGIN2;
                clientNonce = nonce;
                sendLogin(realm, username, clientNonce, digest);
            }
        }
        // pre-authentication
        this.sendPreauthRequest = function () {
            send({ messageType: "PreauthRequest" });
        }
        this.sendPreauthResponse = function (authType, username, response) {
            send({ messageType: "PreauthResponse", authType: authType, username: username, response: response });
        }
        this.sendPreauthDelete = function (username, digest) {
            send({ messageType: "PreauthDelete", username: username, digest: digest });
        }
        // sig
        this.sendCreateSig = function (hw, phys, callControl, regContext, ortc) {
            regContext = regContext ? regContext : 0;
            if (phys) send({ messageType: "CreateSig", hw: hw, phys: phys, callControl: callControl, context: regContext, ortc: ortc });
            else send({ messageType: "CreateSig", hw: hw, callControl: callControl, context: regContext, ortc: ortc });
        }
        this.sendDeleteSig = function (id) {
            send({ messageType: "DeleteSig", id: id });
        }
        this.sendSigChannels = function (id, channelId, command, sdp, media) {
            send({ messageType: "SigChannels", id: id, channelId: channelId, command: command, sdp: sdp, media: media });
        }
        this.sendSigChannelsData = function (id, channelId, command, channels_data, media) {
            send({ messageType: "SigChannelsData", id: id, channelId: channelId, command: command, channels_data: channels_data, media: media });
        }
        this.sendSigCallInit = function (id, name, number, video, sharing) {
            if (name) send({ messageType: "SigCallInit", id: id, name: name, video: video, sharing: sharing });
            else send({ messageType: "SigCallInit", id: id, number: number, video: video, sharing: sharing });
        }
        this.sendSigCallConnect = function (id, callId) {
            send({ messageType: "SigCallConnect", id: id, callId: callId });
        }
        this.sendSigCallClear = function (id, callId) {
            send({ messageType: "SigCallClear", id: id, callId: callId });
        }
        this.sendSigCallDtmf = function (id, callId, digits) {
            send({ messageType: "SigCallDtmf", id: id, callId: callId, digits: digits });
        }
        // monitoring
        this.sendSubscribeEndpoint = function (name, number) {
            if (name) send({ messageType: "SubscribeEndpoint", name: name });
            else send({ messageType: "SubscribeEndpoint", number: number });
        }
        this.sendUnsubscribeEndpoint = function (name, number) {
            if (name) send({ messageType: "UnsubscribeEndpoint", name: name });
            else send({ messageType: "UnsubscribeEndpoint", number: number });
        }
        // apps
        this.appInfo = function () {
            send({ messageType: "AppInfo" });
        }
        this.appGetLogin = function (app, challenge) {
            console.log(app + ": AppGetLogin");
            send({ messageType: "AppGetLogin", app: app, challenge: "" + challenge });
        }
        this.toPBX = function (obj) {
            send(obj);
        }
        // public event handlers
        this.onauthenticate = null;
        // session
        this.onconnected = function (userInfo) { };
        this.onmessage = function (message) { };
        this.onerror = function (error) { };
        this.onclosed = function () { };
        // pre-authentication
        this.onpreauthchallenge = function (authTypes, challenge) { };
        this.onpreauthresult = function (result, seed, encryptedUsername, encryptedPassword) { };
        this.onpreauthdeleteresult = function (result) { };
        // sig
        this.onsigcreated = function (id, error) { };
        this.onsigdeleted = function (id) { };
        this.onsigchannels = function (id, channelId, command, sdp_or_channels_data, iceServers) { };
        this.onsigringon = function (id, channelId) { };
        this.onsigringoff = function (id, channelId) { };
        this.onsigtoneon = function (id, channelId, tone, time) { };
        this.onsigtoneoff = function (id, channelId) { };
        this.onsigdtmf = function (id, channelId) { };
        this.onsigcalladded = function (id, call) { };
        this.onsigcallremoved = function (id, call) { };
        this.onsigcallupdated = function (id, call) { };
        this.onendpointpresence = function (name, number, phoneStatus, imStatus, activity, note) { };
        this.onappinfo = function (app) { };
        this.onapplogin = function (app, domain, sip, guid, dn, info, digest) { };

        // start
        connect();
    }

    // public API
    return _Connection;
})();
