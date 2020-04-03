/*---------------------------------------------------------------------------*/
/* innovaphone.pbxwebsocket.WebRtcEndpoint.js                                */
/* A library for adding WebRTC call functionality to websites using the      */
/* innovaphone PBX                                                           */
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

/// <reference path="innovaphone.pbxwebsocket.Connection.js" />
/// <reference path="innovaphone.pbxwebsocket.ToneGenerator.js" />

var innovaphone = innovaphone || {};
innovaphone.pbxwebsocket = innovaphone.pbxwebsocket || {};
innovaphone.pbxwebsocket.WebRtc = innovaphone.pbxwebsocket.WebRtc || (function (global) {

    // dependencies
    var Connection = innovaphone.pbxwebsocket.Connection,
        ToneGenerator = innovaphone.pbxwebsocket.ToneGenerator,
        AppSharing = innovaphone.applicationSharing ? innovaphone.applicationSharing.main : null,
        PeerConnection = global.RTCPeerConnection || global.mozRTCPeerConnection || global.webkitRTCPeerConnection,
        SessionDescription = global.RTCSessionDescription || global.mozRTCSessionDescription || global.webkitRTCSessionDescription,
        getUserMediaSupported = (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia,
        webRTCSupported = getUserMediaSupported && PeerConnection && SessionDescription;

    // private
    var testMode = false;
    var getUserMedia = function (media, successCallback, errorCallback) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Firefox, W3C standard
            var constraints = {
                audio: media && media.audio ? { echoCancellation: true } : false,
                video: media && media.video ? { width: { min: 160, ideal: 352, max: 640 }, height: { min: 120, ideal: 288, max: 480 } } : false
            };
            navigator.mediaDevices.getUserMedia(constraints).then(successCallback).catch(errorCallback);
        }
        else {
            // Chrome, Opera, old standard
            var constraints = {
                audio: media && media.audio ? true : false,
                video: media && media.video ? { "mandatory": { maxWidth: 640, maxHeight: 480, minWidth: 160, minHeight: 120 } } : false
            };
            if (navigator.getUserMedia) navigator.getUserMedia(constraints, successCallback, errorCallback);
            else if (navigator.webkitGetUserMedia) navigator.webkitGetUserMedia(constraints, successCallback, errorCallback);
            else if (navigator.mozGetUserMedia) navigator.mozGetUserMedia(constraints, successCallback, errorCallback);
        }
    };
    var stopStream = function (stream) {
        if (stream) {
            stream.active = false;
            var tracks = stream.getTracks();
            if (tracks) {
                var len = tracks.length;
                for (var i = 0; i < len; i++) tracks[i].stop();
            }
        }
    };

    // constants
    var defaultDataChannelOptions = { reliable: false, ordered: false },
        defaultDataChannelLabel = "myLabel",
        defaultDataChannelBinaryType = "arraybuffer";

    var activateTestMode = function () {
        testMode = true;
    }

    var Timer = function (startTime) {
        var time = startTime,
            timeout = null;

        this.start = function (callback) {
            if (timeout) {
                clearTimeout(timeout);
                time *= 2;
            }
            timeout = setTimeout(callback, time);
        }

        this.reset = function () {
            if (timeout) clearTimeout(timeout);
            timeout = null;
            time = startTime;
        }
    }

    var SDP = function (sdp) {
        var text = "",
            sessionInfo = "",
            mediaInfo = [],
            media = {};

        var tokenize = function (text, separator) {
            var result = [],
                tmp = text,
                next = 0;
            do {
                next = tmp.indexOf(separator);
                if (next != -1) {
                    result.push(tmp.substring(0, next));
                    tmp = tmp.substr(next + 1);
                }
                else {
                    result.push(tmp);
                }
            }
            while (next != -1);
            return result;
        }

        var separate = function (text, separator) {
            var result = [],
                pos = 0;
            pos = text.indexOf(separator);
            if (pos != -1) {
                result.push(text.substring(0, pos));
                result.push(text.substr(pos + 1));
            }
            else {
                result.push(text);
            }
            return result;
        }

        var parse = function (sdp) {
            var pos = 0,
                nextPos = -1,
                remainder = sdp || "";

            remainder = remainder.replace(/\r/gm, '');
            text = remainder;
            sessionInfo = remainder;
            mediaInfo = [];
            media = {};
            do {
                nextPos = remainder.indexOf("\nm=");
                nextPos = nextPos == -1 ? undefined : nextPos + 1;

                if (pos == 0) {
                    sessionInfo = remainder.substring(0, nextPos);
                    remainder = remainder.substr(nextPos);
                }
                else {
                    var mline = remainder.substring(0, remainder.indexOf("\n"));
                    var mi = {
                        text: remainder.substring(0, nextPos),
                        type: "-",
                        port: "0",
                        profile: "-",
                        formats: [],
                        direction: "sendrecv",
                        coder: null
                    };
                    // m-line
                    var tokens = tokenize(mline, ' ');
                    var tokensLen = tokens.length;
                    mi.type = tokensLen >= 1 ? tokens[0].substr(2) : "";
                    mi.port = tokensLen >= 2 ? tokens[1] : "";
                    mi.profile = tokensLen >= 3 ? tokens[2] : "";
                    for (var i = 3; i < tokensLen; i++) {
                        mi.formats.push({ type: tokens[i], rtpmap: null, sctpmap: null, fmtp: null });
                    }
                    // rtpmap and fmtp
                    var formatsLen = mi.formats.length;
                    tokens = tokenize(mi.text, '\n');
                    tokensLen = tokens.length;
                    for (var i = 0; i < tokensLen; i++) {
                        var line = tokens[i];
                        if (line.substring(0, 9) == "a=rtpmap:") {
                            var subTokens = tokenize(line.substr(9), ' ');
                            for (var j = 0; j < formatsLen; j++) {
                                if (mi.formats[j].type == subTokens[0]) {
                                    mi.formats[j].rtpmap = subTokens[1];
                                    break;
                                }
                            }
                        }
                        else if (line.substring(0, 10) == "a=sctpmap:") {
                            var subTokens = separate(line.substr(10), ' ');
                            for (var j = 0; j < formatsLen; j++) {
                                if (mi.formats[j].type == subTokens[0]) {
                                    mi.formats[j].sctpmap = subTokens[1];
                                    break;
                                }
                            }
                        }
                        else if (line.substring(0, 7) == "a=fmtp:") {
                            var subTokens = tokenize(line.substr(7), ' ');
                            for (var j = 0; j < formatsLen; j++) {
                                if (mi.formats[j].type == subTokens[0]) {
                                    mi.formats[j].fmtp = subTokens[1];
                                    break;
                                }
                            }
                        }
                        else if (line.substring(0, 6) == "a=mid:") {
                            mi.mid = line.substr(6);
                        }
                        else if (line == "a=recvonly") {
                            mi.direction = "recvonly";
                        }
                    }

                    mediaInfo.push(mi);
                    var coder = mi.formats.length > 0 && mi.formats[0].rtpmap ? tokenize(mi.formats[0].rtpmap, '/')[0] : "ANY";
                    if ((mi.profile == "UDP/TLS/RTP/SAVPF" || mi.profile == "RTP/SAVPF" || mi.profile == "DTLS/SCTP") && mi.port != 0) {
                        if (mi.type == "audio") {
                            media.audio = mi.direction;
                            media.audioCoder = coder;
                        }
                        else if (mi.type == "video") {
                            media.video = mi.direction;
                            media.videoCoder = coder;
                        }
                        else if (mi.type == "application") {
                            media.sharing = "recvonly";
                            media.sharingCoder = "JRFB";
                        }
                    }
                    remainder = remainder.substr(nextPos);
                }

                pos = nextPos;
            }
            while (nextPos);
        };

        var createNormalizedOffer = function () {
            // Only keep media descriptions with UDP/TLS/RTP/SAVPF, RTP/SAVPF and DLTS/SCTP
            var result = sessionInfo;
            var mediaInfoLen = mediaInfo.length;
            for (var i = 0; i < mediaInfoLen; i++) {
                var mi = mediaInfo[i];
                var add = mi.profile == "UDP/TLS/RTP/SAVPF" || mi.profile == "RTP/SAVPF" || mi.profile == "DTLS/SCTP";
                if (add) {
                    result += mi.text;
                    if (!mi.mid) result += "a=mid:" + mi.type + "\n";
                    // Firefox 55 needs a=setup for DTLS-SRTP (RFC 5763)
                    if (mi.text.indexOf("a=setup") == -1) {
                        result += "a=setup:actpass\n";
                    }
                }
            }
            result = result.split(" RTP/SAVPF").join(" UDP/TLS/RTP/SAVPF");
            result = result.split("\n").filter(function (s) { return s.indexOf("a=crypto") == -1; }).join("\n");
            return result;
        };

        var createNormalizedAnswer = function (offer) {
            var result = sessionInfo;
            var offerMediaInfoLen = offer.mediaInfo.length;
            var answerMediaInfoLen = mediaInfo.length;
            for (var i = 0; i < offerMediaInfoLen; i++) {
                var found = false;
                for (var j = 0; j < answerMediaInfoLen; j++) {
                    if (mediaInfo[j].type == offer.mediaInfo[i].type) {
                        result += mediaInfo[j].text;
                        if (!mediaInfo[j].mid && offer.mediaInfo[i].mid) result += "a=mid:" + offer.mediaInfo[i].mid + "\n";
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    result += "m=" + offer.mediaInfo[i].type + " 0 " + offer.mediaInfo[i].profile;
                    var rtpmaps = "\nc=IN IP4 0.0.0.0";
                    var formatsLen = offer.mediaInfo[i].formats.length;
                    for (var j = 0; j < formatsLen; j++) {
                        if (offer.mediaInfo[i].formats[j].type && offer.mediaInfo[i].formats[j].rtpmap) {
                            result += " " + offer.mediaInfo[i].formats[j].type;
                            rtpmaps += "\na=rtpmap:" + offer.mediaInfo[i].formats[j].type + " " + offer.mediaInfo[i].formats[j].rtpmap;
                        }
                        else if (offer.mediaInfo[i].formats[j].type && offer.mediaInfo[i].formats[j].sctpmap) {
                            result += " " + offer.mediaInfo[i].formats[j].type;
                            rtpmaps += "\na=sctpmap:" + offer.mediaInfo[i].formats[j].type + " " + offer.mediaInfo[i].formats[j].sctpmap;
                        }
                    }
                    result += rtpmaps;
                    if (offer.mediaInfo[i].mid) result += "\na=mid:" + offer.mediaInfo[i].mid;
                    result += "\na=inactive\n";
                }
            }
            // replace fmtp for H264 with the line from the offer
            var answerFmtp = null;
            var answerFormat = null;
            var offerFmtp = null;
            for (var i = 0; i < answerMediaInfoLen; i++) {
                if (mediaInfo[i].type == "video") {
                    var formats = mediaInfo[i].formats;
                    var formatsLen = formats.length;
                    for (var j = 0; j < formatsLen; j++) {
                        if (formats[j].rtpmap.substring(0, 4) == "H264") {
                            answerFormat = formats[j].type;
                            answerFmtp = "a=fmtp:" + formats[j].type + " " + formats[j].fmtp;
                            break;
                        }
                    }
                }
            }
            for (var i = 0; i < offerMediaInfoLen; i++) {
                if (offer.mediaInfo[i].type == "video") {
                    var formats = offer.mediaInfo[i].formats;
                    var formatsLen = formats.length;
                    for (var j = 0; j < formatsLen; j++) {
                        if (formats[j].type == answerFormat) {
                            offerFmtp = "a=fmtp:" + formats[j].type + " " + formats[j].fmtp;
                        }
                    }
                }
            }
            if (offerFmtp && answerFmtp) {
                result = result.split(answerFmtp).join(offerFmtp);
            }
            result = result.split(" RTP/SAVPF").join(" UDP/TLS/RTP/SAVPF");
            result = result.split("\n").filter(function (s) { return s.indexOf("a=crypto") == -1; }).join("\n");
            return result;
        };

        // initialization
        parse(sdp);
        // public
        this.text = text;
        this.sessionInfo = sessionInfo;
        this.mediaInfo = mediaInfo;
        this.media = media;
        this.createNormalizedOffer = createNormalizedOffer;
        this.createNormalizedAnswer = createNormalizedAnswer;
    };

    var mediaAnd = function (a, b) {
        return {
            "audio": a && b && a.audio && b.audio,
            "video": a && b && a.video && b.video,
            "sharing": a && b && a.sharing && b.sharing
        }
    };

    var Channel = function (id, send, displayName, onStream, onSharing, logFunction) {
        var states = { IDLE: 0, CREATE_OFFER: 1, CREATE_ANSWER: 2, WAIT_ANSWER: 3, CONNECTED: 4 },
            state = states.IDLE,
            localStream = null,
            remoteStream = null,
            peerConnection = null,
            dataChannel = null,
            audio = null,
            gatherTimeout = null,
            dtmfSender = null,
            sigOffer = null,
            sigAnswer = null,
            lastMedia = {},
            currentUserMedia = {},
            log = logFunction ? function (text) { logFunction("Channel(" + id + "): " + text); } : function () { },
            appSharing = AppSharing ? new AppSharing(log, displayName) : null,
            toneGenerator = new ToneGenerator(log);

        var closePeerConnection = function () {
            if (remoteStream) {
                if (onStream) onStream(id, "remote", null);
                remoteStream = null;
            }
            if (dataChannel) {
                dataChannel.close();
                dataChannel.onopen = undefined;
                //dataChannel.onclose = undefined;  // If set, close function not being called
                dataChannel.onerror = undefined;
                dataChannel.onmessage = undefined;
                dataChannel = null;
            }
            if (dtmfSender) {
                dtmfSender = null;
            }
            if (peerConnection) {
                peerConnection.close();
                peerConnection.oniceconnectionstatechange = undefined;
                peerConnection.onsignalingstatechange = undefined;
                peerConnection.onnegotiationneeded = undefined;
                peerConnection.onicecandidate = undefined;
                peerConnection.ontrack = undefined;
                peerConnection = null;
            }
            if (audio) {
                audio.pause();
                audio = null;
            }
        }

        var allocUserMedia = function (config, onSuccess, onError) {
            if (testMode && navigator.mozGetUserMedia) config.fake = true;
            if (config.audio == currentUserMedia.audio && config.video == currentUserMedia.video) {
                log("alloc media: " + JSON.stringify(config) + " unchanged");
                if (onStream && localStream) onStream(id, "local", null);
                currentUserMedia = config;
                onSuccess(localStream);
            }
            else {
                log("alloc media: " + JSON.stringify(config) + " asking for permission");
                releaseUserMedia();
                currentUserMedia = config;
                getUserMedia(config, onSuccess, onError);
            }
        };

        var releaseUserMedia = function () {
            if (localStream) {
                stopStream(localStream);
                localStream = null;
                if (onStream) onStream(id, "local", null);
            }
            currentUserMedia = {};
        }

        var stateIdle = function () {
            closePeerConnection();
            releaseUserMedia();
            if (gatherTimeout) window.clearTimeout(gatherTimeout);
            gatherTimeout = null;
            sigOffer = null;
            sigAnswer = null;
            toneGenerator.toneOff();
            toneGenerator.ringOff();
            log("state=IDLE");
            state = states.IDLE;
            sendMediaInfo();
        }

        var stateCreateOffer = function (iceServers, media) {
            closePeerConnection();
            if (gatherTimeout) window.clearTimeout(gatherTimeout);
            gatherTimeout = null;
            sigOffer = null;
            sigAnswer = null;
            log("state=CREATE_OFFER");
            state = states.CREATE_OFFER;
            allocUserMedia(
                    {
                        "audio": media && media.audio,
                        "video": media && media.video
                    },
                    function (stream) {
                        if (state == states.CREATE_OFFER) {
                            log("create offer");
                            createAudioTag();
                            localStream = stream;
                            if (onStream) onStream(id, "local", stream);
                            peerConnection = new PeerConnection({ "iceServers": iceServers }, { optional: [{ RtpDataChannels: false }] });
                            if (lastMedia && lastMedia.sharing) {
                                log("create data channel");
                                // offer data channel
                                dataChannel = peerConnection.createDataChannel(defaultDataChannelLabel, defaultDataChannelOptions);
                                dataChannel.binaryType = defaultDataChannelBinaryType;
                                dataChannel.onopen = onDataChannelOpen;
                                dataChannel.onclose = onDataChannelClose;
                                dataChannel.onerror = onDataChannelError;
                                dataChannel.onmessage = onDataChannelMessage;
                            }
                            peerConnection.oniceconnectionstatechange = function (e) {
                                var state = (peerConnection ? peerConnection.iceConnectionState : null) || "-";
                                log("ice connection state: " + state);
                                if (state == 'failed') abortCall("ICE failed");
                            }
                            peerConnection.onsignalingstatechange = function (e) {
                                log("signaling state: " + (peerConnection ? peerConnection.signalingState : "-"));
                            }
                            peerConnection.onnegotiationneeded = function (e) {
                                log("negotiation needed");
                            }
                            peerConnection.onicecandidate = function (e) {
                                if (e && e.candidate && e.candidate.candidate) {
                                    log("candidate: " + e.candidate.candidate);
                                    if (gatherTimeout) window.clearTimeout(gatherTimeout);
                                    gatherTimeout = window.setTimeout(sendOffer, 1000);
                                }
                                else {
                                    sendOffer();
                                }
                            }
                            peerConnection.ontrack = function (event) {
                                if (event.streams && event.streams.length) {
                                    log("remote stream added");
                                    remoteStream = event.streams[0];
                                    audio.srcObject = remoteStream;
                                    if (onStream) onStream(id, "remote", remoteStream);
                                }
                            }

                            function sendOffer() {
                                if (gatherTimeout) window.clearTimeout(gatherTimeout);
                                gatherTimeout = null;
                                if (state == states.CREATE_OFFER) {
                                    log("gathering candidates complete, create complete offer");
                                    stateWaitAnswer(peerConnection.localDescription.sdp);
                                }
                            }

                            localStream.getTracks().forEach(function (track) { peerConnection.addTrack(track, stream); });

                            peerConnection.createOffer().then(
                                function (offer) {
                                    console.debug("PhoneWebrtcChannel::createOffer_success() offer=" + JSON.stringify(offer));
                                    var promise = peerConnection.setLocalDescription(offer);
                                    promise.then(function () {
                                        log("local description set");
                                        if (gatherTimeout) window.clearTimeout(gatherTimeout);
                                        gatherTimeout = window.setTimeout(sendOffer, 1000);
                                    });
                                    promise.catch(function () {
                                        abortCall("Could not set local description: " + (error.message || error));
                                    });
                                },
                                function (error) {
                                    abortCall("Could not create offer: " + (error.message || error));
                                });
                        }
                    },
                    function (error) {
                        if (state == states.CREATE_OFFER) {
                            abortCall("Could not alloc media: " + (error.message || error));
                        }
                    }
                );
        }

        var stateCreateAnswer = function (offerSdp, iceServers, media) {
            if (offerSdp) {
                closePeerConnection();
                if (gatherTimeout) window.clearTimeout(gatherTimeout);
                gatherTimeout = null;
                sigOffer = new SDP(offerSdp);
                sigAnswer = null;
                log("state=CREATE_ANSWER");
                state = states.CREATE_ANSWER;
                var effectiveMedia = mediaAnd(sigOffer.media, media);
                allocUserMedia(
                    {
                        "audio": effectiveMedia.audio,
                        "video": effectiveMedia.video
                    },
                    function (stream) {
                        if (state == states.CREATE_ANSWER) {
                            localStream = stream;
                            if (onStream) onStream(id, "local", stream);
                            log("create answer");
                            createAudioTag();
                            peerConnection = new PeerConnection({ "iceServers": iceServers }, { optional: [{ RtpDataChannels: false }] });
                            if (sigOffer.media.sharing) {
                                log("create data channel");
                                dataChannel = peerConnection.createDataChannel(defaultDataChannelLabel, defaultDataChannelOptions);
                                dataChannel.binaryType = defaultDataChannelBinaryType;
                                dataChannel.onopen = onDataChannelOpen;
                                dataChannel.onclose = onDataChannelClose;
                                dataChannel.onerror = onDataChannelError;
                                dataChannel.onmessage = onDataChannelMessage;
                            }
                            peerConnection.oniceconnectionstatechange = function (e) {
                                var state = (peerConnection ? peerConnection.iceConnectionState : null) || "-";
                                log("ice connection state: " + state);
                                if (state == 'failed') abortCall("ICE failed");
                            }
                            peerConnection.onsignalingstatechange = function (e) {
                                log("signaling state: " + (peerConnection ? peerConnection.signalingState : "-"));
                            }
                            peerConnection.onnegotiationneeded = function (e) {
                                log("negotiation needed");
                            }
                            peerConnection.onicecandidate = function (e) {
                                if (e && e.candidate && e.candidate.candidate) {
                                    log("candidate: " + e.candidate.candidate);
                                    if (gatherTimeout) window.clearTimeout(gatherTimeout);
                                    gatherTimeout = window.setTimeout(sendAnswer, 1000);
                                }
                                else {
                                    sendAnswer();
                                }
                            }
                            peerConnection.ontrack = function (event) {
                                if (event.streams && event.streams.length) {
                                    log("remote stream added");
                                    remoteStream = event.streams[0];
                                    audio.srcObject = remoteStream;
                                    if (onStream) onStream(id, "remote", remoteStream);
                                }
                            }

                            function sendAnswer() {
                                if (gatherTimeout) window.clearTimeout(gatherTimeout);
                                gatherTimeout = null;
                                if (state == states.CREATE_ANSWER) {
                                    log("gathering candidates complete, create complete answer");
                                    stateConnected(peerConnection.localDescription.sdp);
                                }
                            }

                            localStream.getTracks().forEach(function (track) { peerConnection.addTrack(track, stream); });

                            var normalizedOffer = sigOffer.createNormalizedOffer();
                            log("normalized offer:\n" + normalizedOffer);
                            var description = new SessionDescription({ "type": "offer", "sdp": normalizedOffer });
                            var setRemoteDescriptionPromise = peerConnection.setRemoteDescription(description);
                            setRemoteDescriptionPromise.then(function () {
                                peerConnection.createAnswer().then(
                                    function (answer) {
                                        log("preliminary answer complete, start gathering candidates");
                                        var promise = peerConnection.setLocalDescription(answer);
                                        promise.then(function () {
                                            log("local description set");
                                            if (gatherTimeout) window.clearTimeout(gatherTimeout);
                                            gatherTimeout = window.setTimeout(sendAnswer, 1000);
                                        });
                                        promise.catch(function (error) {
                                            abortCall("Could not set local description: " + (error.message || error));
                                        });
                                    });
                            });
                            setRemoteDescriptionPromise.catch(function (error) {
                                abortCall("Could not set remote description: " + (error.message || error));
                            });
                        }
                    },
                    function (error) {
                        if (state == states.CREATE_ANSWER) {
                            abortCall("Could not alloc media: " + (error.message || error));
                        }
                    });
            }
            else {
                abortCall("Offer is null");
            }
        }

        var stateWaitAnswer = function (offerSdp) {
            if (gatherTimeout) window.clearTimeout(gatherTimeout);
            gatherTimeout = null;
            if (state == states.CREATE_OFFER) {
                log("state=WAIT_ANSWER");
                state = states.WAIT_ANSWER;
                sigOffer = new SDP(offerSdp);
                send(id, "Offer", offerSdp);
            }
        }

        var stateConnected = function (answerSdp) {
            if (gatherTimeout) window.clearTimeout(gatherTimeout);
            gatherTimeout = null;

            if (state == states.WAIT_ANSWER) {
                sigAnswer = new SDP(answerSdp);
                var normalizedAnswer = sigAnswer.createNormalizedAnswer(sigOffer);
                log("normalized answer:\n" + normalizedAnswer);
                var description = new SessionDescription({ "type": "answer", "sdp": normalizedAnswer });
                var promise = peerConnection.setRemoteDescription(description);
                promise.then(function () {
                    log("state=CONNECTED");
                    state = states.CONNECTED;
                    sendMediaInfo(sigAnswer.media);
                    if (peerConnection.createDTMFSender) {
                        var dtmfTrack = null;
                        var audioTracks = localStream.getAudioTracks();
                        if (audioTracks && audioTracks.length > 0) dtmfTrack = audioTracks[0];
                        if (dtmfTrack) dtmfSender = peerConnection.createDTMFSender(dtmfTrack);
                    }
                    log("DTMF " + (dtmfSender ? "supported" : "not supported"));
                });
                promise.catch(function (error) {
                    abortCall("Could not set remote description: " + (error.message || error));
                });
            }
            else if (state == states.CREATE_ANSWER) {
                sigAnswer = new SDP(answerSdp);
                send(id, "Answer", answerSdp);
                log("state=CONNECTED");
                state = states.CONNECTED;
                sendMediaInfo(sigAnswer.media);
                if (peerConnection.createDTMFSender) {
                    var dtmfTrack = null;
                    var audioTracks = localStream.getAudioTracks();
                    if (audioTracks && audioTracks.length > 0) dtmfTrack = audioTracks[0];
                    if (dtmfTrack) dtmfSender = peerConnection.createDTMFSender(dtmfTrack);
                }
                log("DTMF " + (dtmfSender ? "supported" : "not supported"));
            }
        }

        var sendMediaInfo = function (media) {
            if (JSON.stringify(lastMedia) != JSON.stringify(media)) {
                lastMedia = media;
                send(id, "Info", null, media);
            }
        }

        var abortCall = function (message) {
            log("Abort call: " + (message || ""));
            send(id, "CloseRequest", null);
            stateIdle();
        }

        var createAudioTag = function () {
            if (!audio) {
                audio = document.createElement("audio");
                audio.autoplay = true;
            }
        }

        var onDataChannelOpen = function () {
            log("DataChannel opened");
            if (appSharing) appSharing.init(dataChannel);
            if (onSharing) onSharing();
        }

        var onDataChannelClose = function (e) {
            log("DataChannel closed: " + JSON.stringify(e));
            if (appSharing) appSharing.close();
        }

        var onDataChannelError = function (e) {
            log("DataChannel error: " + JSON.stringify(e));
        }

        var onDataChannelMessage = function (event) {
            if (appSharing) appSharing.recv(event.data);
        }

        // public
        this.id = id;

        this.onsigchannels = function (command, sdp, iceServers, media) {
            if (command == "OfferRequest") stateCreateOffer(iceServers, media);
            else if (command == "Offer") stateCreateAnswer(sdp, iceServers, media);
            else if (command == "Answer") stateConnected(sdp);
            else if (command == "CloseRequest") stateIdle();
        }

        this.onsigringon = function () {
            toneGenerator.ringOn();
        }

        this.onsigringoff = function () {
            toneGenerator.ringOff();
        }

        this.onsigtoneon = function (tone, time) {
            toneGenerator.toneOn(tone, time[0], time[1], time[2], time[3], time[4], time[5], time[6], time[7]);
        }

        this.onsigtoneoff = function () {
            toneGenerator.toneOff();
        }

        this.onsigdtmf = function (digit) {
            if (dtmfSender) {
                log("send DTMF digit=" + digit);
                dtmfSender.insertDTMF(digit);
            }
            else {
                log("can't send DTMF digit=" + digit);
            }
        }

        this.sharing_event = function (type, data) {
            if (appSharing) return appSharing.sharing_event(type, data);
            return false;
        }

        this.close = function () {
            stateIdle();
            toneGenerator.close();
            toneGenerator = null;
            send = null;
            if (onStream && localStream) onStream(id, "local", null);
            localStream = null;
        }
    }

    // constructor
    function _WebRtcEndpoint(url, username, password, hw, phys, regContext, logFunction, onCall, onAuthenticate) {
        var states = { IDLE: 0, WAIT_CONNECT: 1, CONNECT: 2, WAIT_CREATE_SIG: 3, CREATE_SIG: 4, UP: 5, ERROR: 6, CLOSED: 7 },
            state = states.IDLE,
            userInfo = null,
            timer = new Timer(1000),
            connection = null,
            sigId = 0,
            channels = [],
            localVideo = [],
            remoteVideo = [],
            appSharing_canvas = null,
            appSharing_createCb = null,
            appSharing_removeCb = null,
            appSharing_resizeCb = null,
            currentLocalVideoId = null,
            currentRemoteVideoId = null,
            localVideoStream = null,
            remoteVideoStream = null,
            log = logFunction ? function (text) { logFunction("WebRTC: Endpoint: " + text); } : function () { };

        var stateClosed = function () {
            log("state=CLOSED");
            state = states.CLOSED;
            if (connection) connection.close();
            connection = null;
            sigId = 0;
            closeChannels();
            timer.reset();
        }

        var stateWaitConnect = function (error) {
            if (connection) connection.close();
            connection = null;
            sigId = 0;
            closeChannels();
            log("state=WAIT_CONNECT" + (error ? " error=" + error : ""));
            state = states.WAIT_CONNECT;
            timer.start(stateConnect);
        }

        var stateConnect = function () {
            if (connection) connection.close();
            connection = null;
            sigId = 0;
            closeChannels();
            log("state=CONNECT");
            state = states.CONNECT;
            connection = new Connection(url, username, password);
            connection.onauthenticate = onAuthenticate;
            connection.onconnected = onconnected;
            connection.onerror = onerror;
            connection.onclosed = onclosed;
            connection.onsigcreated = onsigcreated;
            connection.onsigdeleted = onsigdeleted;
            connection.onsigchannels = onsigchannels;
            connection.onsigringon = onsigringon;
            connection.onsigringoff = onsigringoff;
            connection.onsigtoneon = onsigtoneon;
            connection.onsigtoneoff = onsigtoneoff;
            connection.onsigdtmf = onsigdtmf;
            connection.onsigcalladded = onsigcalladded;
            connection.onsigcallremoved = onsigcallremoved;
            connection.onsigcallupdated = onsigcallupdated;
        }

        var stateWaitCreateSig = function (error) {
            sigId = 0;
            closeChannels();
            log("state=WAIT_CREATE_SIG" + (error ? " error=" + error : ""));
            state = states.WAIT_CREATE_SIG;
            timer.start(stateCreateSig);
        }

        var stateCreateSig = function () {
            sigId = 0;
            closeChannels();
            log("state=CREATE_SIG");
            state = states.CREATE_SIG;
            connection.sendCreateSig(hw, phys, onCall ? true : false, regContext);
        }

        var stateUp = function (id) {
            closeChannels();
            log("state=UP id=" + id);
            state = states.UP;
            timer.reset();
            sigId = id;
        }

        var stateError = function (error) {
            if (connection) connection.close();
            connection = null;
            sigId = 0;
            closeChannels();
            log("state=ERROR" + (error ? " error=" + error : ""));
            state = states.ERROR;
        }

        // callbacks from websocket
        var onconnected = function (info) {
            userInfo = info;
            timer.reset();
            stateCreateSig();
        }

        var onerror = function (error) {
            if (state != states.CLOSED) stateWaitConnect(error);
        }

        var onclosed = function () {
            if (state != states.CLOSED) stateWaitConnect();
        }

        var onsigcreated = function (id, error) {
            if (error) {
                stateWaitCreateSig(error);
            }
            else {
                stateUp(id);
            }
        }

        var onsigdeleted = function (id) {
            if (id == sigId) {
                stateWaitCreateSig();
            }
        }

        var onsigchannels = function (id, channelId, command, sdp, iceServers, media) {
            if (id == sigId) {
                iceServers = iceServers || [];
                media = media || {};
                log("recv SigChannels ch=" + channelId + ", cmd=" + command + " sdp=" + sdp + " iceServers=" + JSON.stringify(iceServers) + " media=" + JSON.stringify(media));
                var channel = getChannel(channelId);
                channel.onsigchannels(command, sdp, iceServers, media);
            }
        }

        var onsigringon = function (id, channelId) {
            if (id == sigId) {
                log("recv SigRingOn ch=" + channelId);
                var channel = getChannel(channelId);
                channel.onsigringon();
            }
        }

        var onsigringoff = function (id, channelId) {
            if (id == sigId) {
                log("recv SigRingOff ch=" + channelId);
                var channel = getChannel(channelId);
                channel.onsigringoff();
            }
        }

        var onsigtoneon = function (id, channelId, tone, time) {
            if (id == sigId) {
                log("recv SigToneOn ch=" + channelId + ", tone=" + tone + ", time=" + JSON.stringify(time));
                var channel = getChannel(channelId);
                channel.onsigtoneon(tone, time);
            }
        }

        var onsigtoneoff = function (id, channelId) {
            if (id == sigId) {
                log("recv SigToneOff ch=" + channelId);
                var channel = getChannel(channelId);
                channel.onsigtoneoff();
            }
        }

        var onsigdtmf = function (id, channelId, digit) {
            if (id == sigId) {
                log("recv SigDtmf ch=" + channelId + " digit=" + digit);
                var channel = getChannel(channelId);
                channel.onsigdtmf(digit);
            }
        }

        var onsigcalladded = function (id, call) {
            if (id == sigId) {
                log("recv SigCallAdded call=" + JSON.stringify(call));
                if (onCall) onCall("added", call);
            }
        }

        var onsigcallremoved = function (id, call) {
            if (id == sigId) {
                log("recv SigCallRemoved call=" + JSON.stringify(call));
                if (onCall) onCall("removed", call);
            }
        }

        var onsigcallupdated = function (id, call) {
            if (id == sigId) {
                log("recv SigCallUpdated call=" + JSON.stringify(call));
                if (onCall) onCall("updated", call);
            }
        }

        var onsharing = function () {
            sharingEvent('setcontainer', appSharing_canvas);
            sharingEvent('createAppCallback', appSharing_createCb);
            sharingEvent('removeAppCallback', appSharing_removeCb);
            sharingEvent('resizeAppCallback', appSharing_resizeCb);
        }

        var onstream = function (id, type, stream) {
            var isAudio = stream && stream.getAudioTracks() && stream.getAudioTracks().length;
            var isVideo = stream && stream.getVideoTracks() && stream.getVideoTracks().length;
            log("onstream " + id + " " + type + ":" + (isAudio ? " audio" : "") + (isVideo ? ", video" : "") + (!stream ? " null" : ""));
            if (stream && isVideo) {
                if (type == "local") {
                    currentLocalVideoId = id;
                    localVideoStream = stream;
                    var len = localVideo.length;
                    for (var i = 0; i < len; i++) {
                        log("start local video playback");
                        localVideo[i].autoplay = true;
                        localVideo[i].srcObject = stream;
                    }
                }
                else if (type == "remote") {
                    currentRemoteVideoId = id;
                    remoteVideoStream = stream;
                    var len = remoteVideo.length;
                    for (var i = 0; i < len; i++) {
                        log("start remote video playback");
                        remoteVideo[i].autoplay = true;
                        remoteVideo[i].srcObject = stream;
                    }
                }
            }
            else if (type == "local" && id == currentLocalVideoId) {
                log("stop local video playback");
                currentLocalVideoId = null;
                localVideoStream = null;
            }
            else if (type == "remote" && id == currentRemoteVideoId) {
                log("stop remote video playback");
                currentRemoteVideoId = null;
                remoteVideoStream = null;
            }
        }

        var sendSigChannels = function (channelsId, command, sdp, media) {
            if (state == states.UP) {
                log("send SigChannels ch=" + channelsId + ", cmd=" + command + " sdp=" + sdp + " media=" + JSON.stringify(media));
                connection.sendSigChannels(sigId, channelsId, command, sdp, media);
            }
        }

        var getChannel = function (channelId) {
            for (var i in channels) {
                if (channels[i].id == channelId) return channels[i];
            }
            var displayName = userInfo.dn || userInfo.cn || userInfo.name || null;
            var ch = new Channel(channelId, sendSigChannels, displayName, onstream, onsharing, log);
            channels.push(ch);
            return ch;
        }

        var closeChannels = function () {
            var ch;
            while (ch = channels.pop()) ch.close();
        }

        var sharingEvent = function (type, data) {
            var ret = false;
            for (var i in channels) {
                var ret1 = channels[i].sharing_event(type, data);
                if (ret1 != 'unknown') ret = ret1;
            }
            return ret;
        }

        // public
        this.close = function () {
            stateClosed();
        }

        this.setAuthentication = function (username, clientNonce, digest) {
            if (connection) connection.setAuthentication(username, clientNonce, digest);
        }

        this.attachSharing = function (sharingDiv, createAppCallback, removeAppCallback, resizeCallbck) {
            appSharing_canvas = sharingDiv;
            appSharing_createCb = createAppCallback;
            appSharing_removeCb = removeAppCallback;
            appSharing_resizeCb = resizeCallbck;
            onsharing();
        }

        this.detachSharing = function (canvas) {
            if ((canvas != null) && (canvas == appSharing_canvas)) {
                appSharing_canvas = null;
                appSharing_createCb = null;
                appSharing_removeCb = null;
                appSharing_resizeCb = null;
                onsharing();
            }
        }

        this.attachVideo = function (local, remote) {
            if (local) {
                log("attach local video display: " + local);
                localVideo.push(local);
                if (localVideoStream) {
                    log("start local video playback");
                    local.autoplay = true;
                    local.srcObject = localVideoStream;
                }
            }
            if (remote) {
                log("attach remote video display: " + remote);
                remoteVideo.push(remote);
                if (remoteVideoStream) {
                    log("start remote video playback");
                    remote.autoplay = true;
                    remote.srcObject = remoteVideoStream;
                }
            }
        }

        this.detachVideo = function (local, remote) {
            var len = localVideo.length;
            for (var i = 0; i < len; i++) {
                if (localVideo[i] == local) {
                    if (localVideoStream) log("stop local video playback");
                    log("detach local video display: " + local);
                    localVideo.splice(i, 1);
                    break;
                }
            }
            len = remoteVideo.length;
            for (var i = 0; i < len; i++) {
                if (remoteVideo[i] == remote) {
                    if (remoteVideoStream) log("stop remote video playback");
                    log("detach remote video display: " + remote);
                    remoteVideo.splice(i, 1);
                    break;
                }
            }
        }

        this.sharingEvent = function (type, data) {
            return sharingEvent(type, data);
        }

        this.initCall = function (name, number, video, sharing) {
            if (onCall && state == states.UP) {
                log("send SigCallInit name=" + name + ", number=" + number + " video=" + video + " sharing=" + sharing);
                connection.sendSigCallInit(sigId, name, number, video, sharing);
            }
        }

        this.connectCall = function (id) {
            if (onCall && state == states.UP) {
                log("send SigCallConnect id=" + id);
                connection.sendSigCallConnect(sigId, id);
            }
        }

        this.clearCall = function (id) {
            if (onCall && state == states.UP) {
                id = id || null;
                log("send SigCallClear id=" + id);
                connection.sendSigCallClear(sigId, id);
            }
        }

        this.dtmfCall = function (id, digits) {
            if (onCall && state == states.UP) {
                log("send SigCallDtmf id=" + id + "digits=" + digits);
                connection.sendSigCallDtmf(sigId, id, digits);
            }
        }

        // start right away
        if (webRTCSupported) stateConnect();
        else stateError("browser does not support WebRTC");
    }

    // public
    return {
        Endpoint: _WebRtcEndpoint,
        supported: webRTCSupported,
        activateTestMode: activateTestMode
    };
})(window);
