/*---------------------------------------------------------------------------*/
/* innovaphone.applicationSharing.Main.js                                    */
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

/// <reference path="innovaphone.applicationSharing.main.js" />

var innovaphone = innovaphone || {};
innovaphone.applicationSharing = innovaphone.applicationSharing || {};
innovaphone.applicationSharing.PathPrefix = innovaphone.applicationSharing.PathPrefix || "";
innovaphone.applicationSharing.main = innovaphone.applicationSharing.main || (function () {

    // Constructor, application sharing received messages
    var _AppSharingNode = function (msg, seq, timer) {
        var msg = msg;
        var seq = seq;
        var timer = timer;

        // public
        this.msg = msg;
        this.seq = seq;
        this.timer = timer;
    };

    // Constructor
    function _AppSharing(logFunction, displayname) {
        var log = logFunction ? function (text) { logFunction("AppSharing: " + text); } : function () { };

        var INNO_HDR_FLAGS = 0  // Offset 2
        var INNO_HDR_SEQ = 2  // Offset 2
        var INNO_HDR_MSG_TYPE = 4
        var INNO_HDR_APPL_ID = 5
        var INNO_HDR_SENDER_ID = 6
        var INNO_HDR_X_COOR = 8
        var INNO_HDR_Y_COOR = 10
        var INNO_HDR_X_DIM = 12
        var INNO_HDR_Y_DIM = 14
        var INNO_HDR_X_SIZE = 16
        var INNO_HDR_Y_SIZE = 18
        var INNO_HDR_RAW_COLOR = 20
        var INNO_HDR_NUM_EQUAL = 24
        var INNO_HDR_CRC_PNG256 = 28  // next three cannot appear in the same message
        var INNO_HDR_LENGTH = 32  // basic header length
        var INNO_HDR_RECEIVER_ID = INNO_HDR_LENGTH + 0;
        var INNO_HDR_SEQ_NUM = INNO_HDR_LENGTH + 2;
        var INNO_HDR_MSG_VK = INNO_HDR_LENGTH + 2;
        var INNO_HDR_NUM_LOST = INNO_HDR_LENGTH + 4;

        var CURSOR_IDC_ARROW = 0;
        var CURSOR_IDC_HAND = 1;
        var CURSOR_IDC_WAIT = 2;
        var CURSOR_IDC_APPSTARTING = 3;
        var CURSOR_IDC_IBEAM = 4;
        var CURSOR_IDC_CROSS = 5;
        var CURSOR_IDC_HELP = 6;
        var CURSOR_IDC_NO = 7;
        var CURSOR_IDC_SIZEALL = 8;
        var CURSOR_IDC_SIZENESW = 9;
        var CURSOR_IDC_SIZENS = 10;
        var CURSOR_IDC_SIZENWSE = 11;
        var CURSOR_IDC_SIZEWE = 12;
        var CURSOR_IDC_UPARROW = 13;
        var CURSOR_IDC_VSPLIT = 14;
        var CURSOR_IDC_HSPLIT = 15;
        var CURSOR_IDC_H1SPLIT = 16;
        var CURSOR_IDC_H2SPLIT = 17;
        var CURSOR_IDC_V2SPLIT = 18;
        var cursors_file = innovaphone.applicationSharing.PathPrefix + "cursors.png";

        var BLOCK_MSG = 0;
        var BLOCK_MSG_256 = 1;
        var PLAIN_MSG = 2;
        var NONE_COMP = 0;
        var PNG_COMP = 1;
        var JPEG_COMP = 2;
        var INDEX_APP_ID = 10;
        var END_BIT_SCTP = 0x80;
        var START_BIT_SCTP = 0x40;
        var END_BIT_IMG = 0x20;
        var START_BIT_IMG = 0x10;
        var inno_seq = 0;
        var process_timer = 0;
        var myTimer = null;
        var first_pkt_rx = false;
        var is_processing = false;
        var sender_changed = false;

        var imageData = new Array(256);
        var rx_apps = new Array(256);
        var rx_tabs = new Array(256);
        var img_h = new Array(256);
        var img_w = new Array(256);
        var app_name = new Array(256);
        var activeApp = -1;
        var activePart = -1;

        var sharingQueue = new Array(256);
        var waitingQueue = new Array(256);
        var start_processing = new Array(256);
        var last_proc_seq = new Array(256);
        var have_control = new Array(256);

        for (var i = 0; i < 256; i++) {
            imageData[i] = new Array(256);
            rx_apps[i] = new Array(256);
            rx_tabs[i] = new Array(256);
            img_w[i] = new Array(256);
            img_h[i] = new Array(256);
            app_name[i] = new Array(256);
            for (var j = 0; j < 256; j++) {
                imageData[i][j] = null;
                rx_apps[i][j] = 0;
                rx_tabs[i][j] = 0;
                img_w[i][j] = 0;
                img_h[i][j] = 0;
                app_name[i][j] = "app_" + i + "_" + j;
            }
            sharingQueue[i] = [];
            waitingQueue[i] = 0;
            start_processing[i] = true;
            last_proc_seq[i] = 0;
            have_control[i] = false;
        }

        var scaleImage = false;
        var sender_id = 0;
        var sender_name = displayname;
        var sender_name_len = sender_name.length;
        var mouse_element = null;
        var myCanvas = null;
        var mouse_type = -1;
        var m_offset_x = 0;
        var m_offset_y = 0;
        var container_id = null;
        var dataChannel = null;
        var remote_part = "";
        var last_mouse_x = 0;
        var last_mouse_y = 0;
        var onCreateApp = null;
        var onRemoveApp = null;
        var onResizeApp = null;
        var num_packets_rx = 0;
        var num_packets_proc = 0;

        var canvas = new Array(3);
        var ctx = new Array(3);

        for (var i = 0; i < 3; i++) {
            canvas[i] = document.createElement("canvas");
            canvas[i].setAttribute("id", "webrtc.sharing." + i);
            ctx[i] = canvas[i].getContext("2d");
        }

        var VK_BACK = 0x8, VK_TAB = 0x9, VK_CLEAR = 0xC, VK_RETURN = 0xD, VK_SPACE = 0x20;
        var VK_SHIFT = 0x10, VK_CONTROL = 0x11, VK_MENU = 0x12;
        var VK_CAPITAL = 0x14;
        var VK_ESCAPE = 0x1B;
        var VK_LEFT = 0x25, VK_TOP = 0x26, VK_RIGHT = 0x27, VK_BOTTOM = 0x28;
        var VK_PRIOR = 0x21, VK_NEXT = 0x22;
        var VK_END = 0x23, VK_HOME = 0x24;
        var VK_0 = 0x30, VK_1 = 0x31, VK_2 = 0x32, VK_3 = 0x33, VK_4 = 0x34;
        var VK_5 = 0x35, VK_6 = 0x36, VK_7 = 0x37, VK_8 = 0x38, VK_9 = 0x39;
        var VK_A = 0x41, VK_Z = 0x5A;
        var VK_a = 0x61, VK_z = 0x7A;
        var VK_LWIN = 0x5B;

        var lastKeyDefined = 0x39;
        var is_shift_down = false;
        var is_ctrl_down = false;

        var keyCodes = [
             0, 1, 2, 3, 4, 5, 6, 7, VK_BACK, VK_TAB,
            10, 11, VK_CLEAR, VK_RETURN, 14, 15, VK_SHIFT, VK_CONTROL, VK_MENU, 19,
            VK_CAPITAL, 21, 22, 23, 24, 25, 26, VK_ESCAPE, 28, 29,
            30, 31, VK_SPACE, VK_PRIOR, VK_NEXT, VK_END, VK_HOME, VK_LEFT, VK_TOP, VK_RIGHT,
            VK_BOTTOM, 41, 42, 43, 44, 45, 46, 47,
            VK_0, VK_1, VK_2, VK_3, VK_4, VK_5, VK_6, VK_7, VK_8, VK_9];

        // 50 msec.
        function processingInterval() {
            process_timer++;
            for (var i = 0; i < 256; i++) {
                if (waitingQueue[i]) processingNode(i);
                waitingQueue[i] = 0;
            }
        }

        function getWidth() {
            return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || document.body.offsetWidth;
        }

        function getHeight() {
            return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || document.body.offsetHeight;
        }

        function getContainerWidth() {
            if (container_id == null) return getWidth();
            return parseInt(container_id.style.width, 10);
        }

        function getContainerHeight() {
            if (container_id == null) return getHeight();
            return parseInt(container_id.style.height, 10);
        }

        function sendOwnName(app, dest) {
            if (sender_name_len == 0) {
                log('sender name is empty');
                return;
            }
            log('Send display name (' + sender_name + ')');
            var arrayMsgS = new ArrayBuffer(36 + 1 + (sender_name_len << 1));
            var dmsg = new Uint8Array(arrayMsgS);
            var t_seq = inno_seq++;
            dmsg[INNO_HDR_FLAGS] = 0xf0;
            dmsg[INNO_HDR_MSG_TYPE] = 11;  // SEND_NAME
            dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
            dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
            dmsg[INNO_HDR_APPL_ID] = app;
            dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
            dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 0] = (dest >> 8) & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 1] = dest & 0xff;
            dmsg[INNO_HDR_LENGTH + 4] = (sender_name_len << 1);
            var nstr = sender_name;
            var ind_a = INNO_HDR_LENGTH + 5;
            for (var i = 0; i < sender_name_len; i++) {
                var c = nstr.charCodeAt(i);
                //log('name = ' + c);
                dmsg[ind_a + 0] = c & 0xff;
                dmsg[ind_a + 1] = (c >> 8) & 0xff;
                ind_a = ind_a + 2;
            }
            if (dataChannel) dataChannel.send(arrayMsgS);
        }

        function requestAppName(app, dest) {
            var arrayMsg = new ArrayBuffer(36);
            var dmsg = new Uint8Array(arrayMsg);
            var t_seq = inno_seq++;
            dmsg[INNO_HDR_FLAGS] = 0xf0;
            dmsg[INNO_HDR_MSG_TYPE] = 135;  // REQUEST_NAME
            dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
            dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
            dmsg[INNO_HDR_APPL_ID] = app;
            dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
            dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 0] = (dest >> 8) & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 1] = dest & 0xff;
            if (dataChannel) dataChannel.send(arrayMsg);
            else log('requestAppName failed');
        }

        function requestNewPicture(app, dest) {
            var arrayMsg = new ArrayBuffer(36);
            var dmsg = new Uint8Array(arrayMsg);
            var t_seq = inno_seq++;
            dmsg[INNO_HDR_FLAGS] = 0xf0;
            dmsg[INNO_HDR_MSG_TYPE] = 130;  // REQ_NEW_PIC
            dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
            dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
            dmsg[INNO_HDR_APPL_ID] = app;
            dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
            dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 0] = (dest >> 8) & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 1] = dest & 0xff;
            if (dataChannel) dataChannel.send(arrayMsg);
            else log('requestNewPicture failed');
        }

        function reportPacketLost(lost, num_lost, dest) {
            var arrayMsgS = new ArrayBuffer(38);
            var dmsg = new Uint8Array(arrayMsgS);
            var t_seq = inno_seq++;
            dmsg[INNO_HDR_FLAGS] = 0xf0;
            dmsg[INNO_HDR_MSG_TYPE] = 128;                    // SEQ_LOST
            dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
            dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
            dmsg[INNO_HDR_APPL_ID] = 0xff;
            dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
            dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 0] = (dest >> 8) & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 1] = dest & 0xff;
            dmsg[INNO_HDR_SEQ_NUM + 0] = (lost >> 8) & 0xff;
            dmsg[INNO_HDR_SEQ_NUM + 1] = lost & 0xff;
            dmsg[INNO_HDR_NUM_LOST + 0] = (num_lost >> 8) & 0xff;
            dmsg[INNO_HDR_NUM_LOST + 1] = num_lost & 0xff;
            if (dataChannel) dataChannel.send(arrayMsgS);
        }

        function sharingEvent(type, data) {
            //log('sharingEvent ' + type + ' data ' + data);
            switch (type) {
                case 'setcontainer':
                    setContainer(data);
                    break;
                case 'createAppCallback':
                    onCreateApp = data;
                    if (onCreateApp) {
                        for (var i = 0; i < 256; i++) {
                            for (var j = 0; j < 256; j++) {
                                if ((rx_apps[i][j]) && (app_name[i][j] != ("app_" + i + "_" + j)) && (app_name[i][j] != "") && (rx_tabs[i][j] == 0)) {
                                    onCreateApp(i, j, app_name[i][j]);
                                    rx_tabs[i][j] = 1;
                                }
                            }
                        }
                    }
                    break;
                case 'removeAppCallback':
                    onRemoveApp = data;
                    break;
                case 'resizeAppCallback':
                    onResizeApp = data;
                    break;
                case 'setname':
                    setOwnName(data);
                    break;
                case 'changeDisplayApp':
                    changeDisplayApp(data);
                    break;
                case 'changeDisplaySender':
                    changeDisplaySender(data);
                    break;
                case 'fitToElement':
                    fitToElement(data);
                    break;
                case 'adjustImageToCanvas':
                    adjustImageToCanvas();
                    break;
                case 'requestControl':
                    requestControl();
                    break;
                default:
                    log('unknown event received: ' + type);
            }
            //log('sharingEvent -> ' + type);
        }

        function mouseWheel(e)
        {
            // build msg!!!!
            var arrayMsg = new ArrayBuffer(36);
            var dmsg = new Uint8Array(arrayMsg);
            var t_seq = inno_seq++;
            dmsg[INNO_HDR_FLAGS] = 0xf0;
            dmsg[INNO_HDR_MSG_TYPE] = 199;
            dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
            dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
            dmsg[INNO_HDR_APPL_ID] = activeApp;
            dmsg[INNO_HDR_X_COOR] = 0;
            dmsg[INNO_HDR_X_COOR + 1] = (e.wheelDelta < 0 ? 1 : 0);
            dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
            dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 0] = (activePart >> 8) & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 1] = activePart & 0xff;
            if (dataChannel) dataChannel.send(arrayMsg);

            return false;
        }

        function onKeyUp(keyCode, shiftKey, altKey, ctrlKey, app) {
            //log("onKeyUp " + keyCode + ' ' + shiftKey + ' ' + altKey + ' ' + ctrlKey);
            var ret = Array(3);

            if ((keyCode >= VK_A && keyCode <= VK_Z) || (keyCode >= VK_a && keyCode <= VK_z)) {
                ret[0] = 0;
                return ret;
            }
            else { //if (keyCode < lastKeyDefined) {
                ret[0] = 1;
                ret[1] = 0;
                if (!shiftKey && !altKey && !ctrlKey) {   // if special key set, ignore it
                    ret[1] = 203;
                    ret[2] = keyCode;
                }
                else if (((keyCode == VK_SHIFT) && ctrlKey && is_shift_down) || ((keyCode == VK_CONTROL) && shiftKey && is_ctrl_down)) {
                    ret[1] = 203;
                    ret[2] = keyCode;
                }
                is_shift_down = shiftKey;
                is_ctrl_down = ctrlKey;
            }
            return ret;
        }

        function keyUp(e, type) {
            //log("IE-onKeyUp " + e.charCode + ' ' + e.which + ' ' + e.keyCode + ' ' + e.shiftKey + ' ' + e.altKey + ' ' + e.ctrlKey);
            var ret = onKeyUp(e.keyCode, e.shiftKey, e.altKey, e.ctrlKey, activeApp);
            if (ret[0] == 0) {
                return false;
            }
            // build msg!!!!
            var arrayMsg = new ArrayBuffer(36);
            var dmsg = new Uint8Array(arrayMsg);
            var t_seq = inno_seq++;
            dmsg[INNO_HDR_FLAGS] = 0xf0;
            dmsg[INNO_HDR_MSG_TYPE] = ret[1];
            dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
            dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
            dmsg[INNO_HDR_APPL_ID] = activeApp;
            dmsg[INNO_HDR_X_COOR + 0] = (ret[2] >> 8) & 0xff;
            dmsg[INNO_HDR_X_COOR + 1] = ret[2] & 0xff;
            dmsg[INNO_HDR_Y_COOR + 0] = 0;
            dmsg[INNO_HDR_Y_COOR + 1] = 1;
            dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
            dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 0] = (activePart >> 8) & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 1] = activePart & 0xff;
            dmsg[INNO_HDR_MSG_VK + 0] = (ret[2] >> 8) & 0xff;
            dmsg[INNO_HDR_MSG_VK + 1] = ret[2] & 0xff;
            if (dataChannel) dataChannel.send(arrayMsg);
            return true;
        }

        function onKeyDown(keyCode, shiftKey, altKey, ctrlKey, app) {
            //log("onKeyDown " + keyCode + ' ' + shiftKey + ' ' + altKey + ' ' + ctrlKey);
            var ret = Array(3);

            if ((keyCode >= VK_A && keyCode <= VK_Z) || (keyCode >= VK_a && keyCode <= VK_z)) {   // Ctrl + X
                if (shiftKey) keyCode += 256;
                if (ctrlKey) keyCode += 512;
                if (altKey) keyCode += 1024;
                if (altKey || ctrlKey) {
                    ret[0] = 0;
                    ret[1] = 200;
                    ret[2] = keyCode;
                    return ret;
                }
            }
            else { //if (keyCode < lastKeyDefined) {
                ret[0] = 0;
                ret[1] = 0;
                if (keyCode != VK_SHIFT && keyCode != VK_CONTROL && keyCode != VK_MENU) {
                    if (shiftKey) keyCode += 256;
                    if (ctrlKey) keyCode += 512;
                    if (altKey) keyCode += 1024;
                    if (keyCode > 256) {
                        ret[1] = 202;
                        ret[2] = keyCode;
                        is_shift_down = shiftKey;
                        is_ctrl_down = ctrlKey;
                    }
                    else {
                        ret[1] = 201;
                        ret[2] = keyCode;
                    }
                }
                return ret;
            }
            ret[0] = 1;
            return ret;
        }

        function keyDown(e) {
            //log("KeyDown " + e.charCode + ' ' + e.which + ' ' + e.keyCode + ' ' + e.shiftKey + ' ' + e.altKey + ' ' + e.ctrlKey);
            var ret = onKeyDown(e.keyCode, e.shiftKey, e.altKey, e.ctrlKey, activeApp);
            if (ret[0] == 0) {
                if (ret[1]) {
                    var arrayMsg = new ArrayBuffer(36);
                    var dmsg = new Uint8Array(arrayMsg);
                    var t_seq = inno_seq++;
                    dmsg[INNO_HDR_FLAGS] = 0xf0;
                    dmsg[INNO_HDR_MSG_TYPE] = ret[1];
                    dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
                    dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
                    dmsg[INNO_HDR_APPL_ID] = activeApp;
                    dmsg[INNO_HDR_X_COOR + 0] = (ret[2] >> 8) & 0xff;
                    dmsg[INNO_HDR_X_COOR + 1] = ret[2] & 0xff;
                    dmsg[INNO_HDR_Y_COOR + 0] = 0;
                    dmsg[INNO_HDR_Y_COOR + 1] = 1;
                    dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
                    dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
                    dmsg[INNO_HDR_RECEIVER_ID + 0] = (activePart >> 8) & 0xff;
                    dmsg[INNO_HDR_RECEIVER_ID + 1] = activePart & 0xff;
                    dmsg[INNO_HDR_MSG_VK + 0] = (ret[2] >> 8) & 0xff;
                    dmsg[INNO_HDR_MSG_VK + 1] = ret[2] & 0xff;
                    if (dataChannel) dataChannel.send(arrayMsg);
                }
                return false;
            }
            return true;
        }

        function onKeyPressed(keyCode, shiftKey, altKey, ctrlKey, app) {
            var ret = Array(3);

            //log("onKeyPressed " + keyCode + ' ' + shiftKey + ' ' + altKey + ' ' + ctrlKey);

            ret[0] = 1;
            ret[1] = 0;
            if (keyCode >= VK_A && keyCode <= VK_z) {
                if (shiftKey) keyCode += 256;
                if (ctrlKey) keyCode += 512;
                if (altKey) keyCode += 1024;
                ret[0] = 0;
                ret[1] = 200;
                ret[2] = keyCode;
            }
            return ret;
        }

        function keyPress(e, type) {
            //log("KeyPressed t=" + type + ' ' + e.charCode + ' ' + e.which + ' ' + e.keyCode + ' ' + e.shiftKey + ' ' + e.altKey + ' ' + e.ctrlKey);
            if (type == 'keypress_l') {
                var ch = e.keyCode || e.which;
                var ret = onKeyPressed(e.keyCode || e.which, e.shiftKey, e.altKey, e.ctrlKey, activeApp);
            }
            else {
                var ch = e.keyCode;
                var ret = onKeyPressed(e.keyCode, e.shiftKey, e.altKey, e.ctrlKey, activeApp);
            }
            if (ret[0] == 0) {
                if (ret[1]) {
                    var arrayMsg = new ArrayBuffer(36);
                    var dmsg = new Uint8Array(arrayMsg);
                    var t_seq = inno_seq++;
                    dmsg[INNO_HDR_FLAGS] = 0xf0;
                    dmsg[INNO_HDR_MSG_TYPE] = ret[1];
                    dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
                    dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
                    dmsg[INNO_HDR_APPL_ID] = activeApp;
                    dmsg[INNO_HDR_X_COOR + 0] = (ch >> 8) & 0xff;
                    dmsg[INNO_HDR_X_COOR + 1] = ch & 0xff;
                    dmsg[INNO_HDR_Y_COOR + 0] = 0;
                    dmsg[INNO_HDR_Y_COOR + 1] = 1;
                    dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
                    dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
                    dmsg[INNO_HDR_RECEIVER_ID + 0] = (activePart >> 8) & 0xff;
                    dmsg[INNO_HDR_RECEIVER_ID + 1] = activePart & 0xff;
                    dmsg[INNO_HDR_MSG_VK + 0] = (ret[2] >> 8) & 0xff;
                    dmsg[INNO_HDR_MSG_VK + 1] = ret[2] & 0xff;
                    if (dataChannel) dataChannel.send(arrayMsg);
                }
                return false;
            }
            return true;
        }

        function onMouseMove(x, y, app, scale_pic, pic_x, pic_y, rect, container_id) {
            if ((last_mouse_x == x) && (last_mouse_y == y)) {
                return null;
            }

            last_mouse_x = x;
            last_mouse_y = y;

            var new_x = x;
            var new_y = y;
            if (scale_pic && container_id) {
                var scale_x, scale_y;
                if (pic_x)
                    scale_x = parseInt(container_id.style.width, 10) / pic_x;
                else
                    scale_x = 1;
                if (pic_y)
                    scale_y = parseInt(container_id.style.height, 10) / pic_y;
                else
                    scale_y = 1;
                var scale = (scale_x < scale_y ? scale_x : scale_y);

                if (scale < 1) {
                    var tw, th;
                    if (scale > 0 && container_id.style.width && container_id.style.height) {
                        tw = Math.floor(pic_x * scale); // target image width
                        th = Math.floor(pic_y * scale); // target image height
                    }
                    else if (scale_x > 0 && scale_y > 0) {
                        tw = Math.floor(pic_x * scale_x); // target image width
                        th = Math.floor(pic_y * scale_y); // target image width
                    }
                    else {
                        tw = pic_x;
                        th = pic_y;
                    }
                    if (tw) x = (pic_x * x) / tw;
                    if (th) y = (pic_y * (y - 30)) / th;

                    new_x = (0 | x);
                    new_y = (0 | y);
                }
            }
            else {
                new_x -= rect.left;
                new_y -= rect.top;
            }

            var coord = new Array(2);
            coord[0] = new_x;
            coord[1] = new_y;

            return coord;
        }

        function mouseMoveHandle(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            var rect = canvas[2].getBoundingClientRect();
            //log('mouseMoveHandle ' + e.clientY + ' x= ' + e.clientX);
            //log('rect ' + rect.top + ' b= ' + rect.bottom + ' l= ' + rect.left + ' r= ' + rect.right);
            if (e.clientY < rect.top || e.clientX < rect.left) return;
            if (e.clientY > rect.bottom || e.clientX > rect.right) return;

            var coord = onMouseMove(e.clientX, e.clientY, activeApp, scaleImage, img_w[activePart][activeApp], img_h[activePart][activeApp], rect, container_id);
            if (coord) {
                var arrayMsg = new ArrayBuffer(36);
                var dmsg = new Uint8Array(arrayMsg);
                var t_seq = inno_seq++;
                dmsg[INNO_HDR_FLAGS] = 0xf0;
                dmsg[INNO_HDR_MSG_TYPE] = 198;
                dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
                dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
                dmsg[INNO_HDR_APPL_ID] = activeApp;
                dmsg[INNO_HDR_X_COOR] = (coord[0] >> 8) & 0xff;
                dmsg[INNO_HDR_X_COOR + 1] = coord[0] & 0xff;
                dmsg[INNO_HDR_Y_COOR] = (coord[1] >> 8) & 0xff;
                dmsg[INNO_HDR_Y_COOR + 1] = coord[1] & 0xff;
                dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
                dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
                dmsg[INNO_HDR_RECEIVER_ID + 0] = (activePart >> 8) & 0xff;
                dmsg[INNO_HDR_RECEIVER_ID + 1] = activePart & 0xff;
                if (dataChannel) dataChannel.send(arrayMsg);
            }
        }

        function onMouseUp(button, x, y, app, scale_pic, pic_x, pic_y, rect, container_id) {
            var mouse_click;
            if (button == 0) {
                mouse_click = 193;
            }
            else if (button == 2) {
                mouse_click = 196;
            }
            else return null;

            last_mouse_x = x;
            last_mouse_y = y;

            var new_x = x;
            var new_y = y;
            if (scale_pic && container_id) {
                var scale_x, scale_y;
                if (pic_x)
                    scale_x = parseInt(container_id.style.width, 10) / pic_x;
                else
                    scale_x = 1;
                if (pic_y)
                    scale_y = parseInt(container_id.style.height, 10) / pic_y;
                else
                    scale_y = 1;
                var scale = (scale_x < scale_y ? scale_x : scale_y);

                if (scale < 1) {
                    var tw, th;
                    if (scale > 0 && container_id.style.width && container_id.style.height) {
                        tw = Math.floor(pic_x * scale); // target image width
                        th = Math.floor(pic_y * scale); // target image height
                    }
                    else if (scale_x > 0 && scale_y > 0) {
                        tw = Math.floor(pic_x * scale_x); // target image width
                        th = Math.floor(pic_y * scale_y); // target image width
                    }
                    else {
                        tw = pic_x;
                        th = pic_y;
                    }
                    if (tw) x = (pic_x * x) / tw;
                    if (th) y = (pic_y * (y - 30)) / th;

                    new_x = (0 | x);
                    new_y = (0 | y);
                }
            }
            else {
                new_x -= rect.left;
                new_y -= rect.top;
            }

            var coord = new Array(3);
            coord[0] = new_x;
            coord[1] = new_y;
            coord[2] = mouse_click;

            return coord;
        }

        function mouseUpHandle(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            //log('mouseUpHandle');

            var evt = e;
            var rect = canvas[2].getBoundingClientRect();
            if (evt.clientY < rect.top || evt.clientX < rect.left) return;
            if (evt.clientY > rect.bottom || evt.clientX > rect.right) return;

            var coord = onMouseUp(evt.button, evt.clientX, evt.clientY, activeApp, scaleImage, img_w[activePart][activeApp], img_h[activePart][activeApp], rect, container_id);
            if (coord) {
                var arrayMsg = new ArrayBuffer(36);
                var dmsg = new Uint8Array(arrayMsg);
                var t_seq = inno_seq++;
                dmsg[INNO_HDR_FLAGS] = 0xf0;
                dmsg[INNO_HDR_MSG_TYPE] = coord[2];   // mouse_click
                dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
                dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
                dmsg[INNO_HDR_APPL_ID] = activeApp;
                dmsg[INNO_HDR_X_COOR] = (coord[0] >> 8) & 0xff;
                dmsg[INNO_HDR_X_COOR + 1] = coord[0] & 0xff;
                dmsg[INNO_HDR_Y_COOR] = (coord[1] >> 8) & 0xff;
                dmsg[INNO_HDR_Y_COOR + 1] = coord[1] & 0xff;
                dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
                dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
                dmsg[INNO_HDR_RECEIVER_ID + 0] = (activePart >> 8) & 0xff;
                dmsg[INNO_HDR_RECEIVER_ID + 1] = activePart & 0xff;
                if (dataChannel) dataChannel.send(arrayMsg);
            }
        }

        function onMouseDown(button, x, y, app, scale_pic, pic_x, pic_y, rect, container_id) {
            var mouse_click;
            if (button == 0) {
                mouse_click = 192;
            }
            else if (button == 2) {
                mouse_click = 195;
            }
            else return null;

            last_mouse_x = x;
            last_mouse_y = y;

            var new_x = x;
            var new_y = y;
            if (scale_pic && container_id) {
                var scale_x, scale_y;
                if (pic_x)
                    scale_x = parseInt(container_id.style.width, 10) / pic_x;
                else
                    scale_x = 1;
                if (pic_y)
                    scale_y = parseInt(container_id.style.height, 10) / pic_y;
                else
                    scale_y = 1;
                var scale = (scale_x < scale_y ? scale_x : scale_y);

                if (scale < 1) {
                    var tw, th;
                    if (scale > 0 && container_id.style.width && container_id.style.height) {
                        tw = Math.floor(pic_x * scale); // target image width
                        th = Math.floor(pic_y * scale); // target image height
                    }
                    else if (scale_x > 0 && scale_y > 0) {
                        tw = Math.floor(pic_x * scale_x); // target image width
                        th = Math.floor(pic_y * scale_y); // target image width
                    }
                    else {
                        tw = pic_x;
                        th = pic_y;
                    }
                    if (tw) x = (pic_x * x) / tw;
                    if (th) y = (pic_y * (y - 30)) / th;

                    new_x = (0 | x);
                    new_y = (0 | y);
                }
            }
            else {
                new_x -= rect.left;
                new_y -= rect.top;
            }

            var coord = new Array(3);
            coord[0] = new_x;
            coord[1] = new_y;
            coord[2] = mouse_click;

            return coord;
        }

        function mouseDownHandle(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            //log('mouseDownHandle');

            var evt = e;
            //writeToScreen("mouseDownHandle " + e.button + ' ' + e.clientX + ' ' + e.clientY);
            var rect = canvas[2].getBoundingClientRect();
            if (evt.clientY < rect.top || evt.clientX < rect.left) return;
            if (evt.clientY > rect.bottom || evt.clientX > rect.right) return;

            var coord = onMouseDown(evt.button, evt.clientX, evt.clientY, activeApp, scaleImage, img_w[activePart][activeApp], img_h[activePart][activeApp], rect, container_id);
            if (coord) {
                var arrayMsg = new ArrayBuffer(36);
                var dmsg = new Uint8Array(arrayMsg);
                var t_seq = inno_seq++;
                dmsg[INNO_HDR_FLAGS] = 0xf0;
                dmsg[INNO_HDR_MSG_TYPE] = coord[2];   // mouse_click
                dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
                dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
                dmsg[INNO_HDR_APPL_ID] = activeApp;
                dmsg[INNO_HDR_X_COOR] = (coord[0] >> 8) & 0xff;
                dmsg[INNO_HDR_X_COOR + 1] = coord[0] & 0xff;
                dmsg[INNO_HDR_Y_COOR] = (coord[1] >> 8) & 0xff;
                dmsg[INNO_HDR_Y_COOR + 1] = coord[1] & 0xff;
                dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
                dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
                dmsg[INNO_HDR_RECEIVER_ID + 0] = (activePart >> 8) & 0xff;
                dmsg[INNO_HDR_RECEIVER_ID + 1] = activePart & 0xff;
                if (dataChannel) dataChannel.send(arrayMsg);
            }
        }

        function mouseDoubleClickHandle(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            //log('mouseDoubleClickHandle');

            var evt = e;
            var rect = canvas[2].getBoundingClientRect();
            if (evt.clientY < rect.top || evt.clientX < rect.left) return;
            if (evt.clientY > rect.bottom || evt.clientX > rect.right) return;

            //onMouseDoubleClick(evt.button, evt.clientX, evt.clientY, activeApp, scaleImage, img_w[activePart][activeApp], img_h[activePart][activeApp], rect);
        }

        function domMouseScroll(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            //log('domMouseScroll ' + e.wheelDelta);

            var arrayMsg = new ArrayBuffer(36);
            var dmsg = new Uint8Array(arrayMsg);
            var t_seq = inno_seq++;
            dmsg[INNO_HDR_FLAGS] = 0xf0;
            dmsg[INNO_HDR_MSG_TYPE] = 199;
            dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
            dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
            dmsg[INNO_HDR_APPL_ID] = activeApp;
            dmsg[INNO_HDR_X_COOR] = 0;
            dmsg[INNO_HDR_X_COOR + 1] = (e.wheelDelta < 0 ? 1 : 0);
            dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
            dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 0] = (activePart >> 8) & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 1] = activePart & 0xff;
            if (dataChannel) dataChannel.send(arrayMsg);

            e.stopPropagation();
            e.preventDefault();
            e.cancelBubble = false;
        }

        function restoreNoCtrlMode()
        {
            if (container_id) {
                for (i = 0; i < container_id.childNodes.length; i++) {
                    if (container_id.childNodes[i].nodeName == 'CANVAS' || container_id.childNodes[i].nodeName == 'canvas') {
                        myCanvas = container_id.childNodes[i];
                        myCanvas.style["cursor"] = "default";
                        break;
                    }
                }
            }
            var doc = canvas[2].ownerDocument;
            var win = null;
            if (doc) {
                win = doc.defaultView || doc.parentWindow;
            }
            else {
                doc = container_id.ownerDocument;
                if (doc) {
                    win = doc.defaultView || doc.parentWindow;
                }
            }
            if (canvas[2].removeEventListener) {
                canvas[2].removeEventListener("mousedown", mouseDownHandle, false);
                canvas[2].removeEventListener("mousemove", mouseMoveHandle, false);
                canvas[2].removeEventListener("mouseup", mouseUpHandle, false);
                canvas[2].removeEventListener("dblclick", mouseDoubleClickHandle, false);
                canvas[2].removeEventListener("DOMMouseScroll", domMouseScroll, false);
                canvas[2].removeEventListener('mousewheel', mousewheel_l, false);
                if (win) {
                    win.removeEventListener('keypress', keypress_l, false);
                    win.removeEventListener('keydown', keydown_l, false);
                    win.removeEventListener('keyup', keyup_l, false);
                }
            }
            else if (canvas[2].removeEvent) {
                canvas[2].removeEvent("onmousedown", mouseDownHandle, false);
                canvas[2].removeEvent("onmousemove", mouseMoveHandle, false);
                canvas[2].removeEvent("onmouseup", mouseUpHandle, false);
                canvas[2].removeEvent("ondblclick", mouseDoubleClickHandle, false);
                canvas[2].removeEvent('onmousewheel', mousewheel_a, false);
                canvas[2].removeEvent('mousewheel', mousewheel_a, false);
                if (win) {
                    win.removeEvent('keypress', keypress_a, false);
                    win.removeEvent('keydown', keydown_a, false);
                    win.removeEvent('keyup', keyup_a, false);
                    win.removeEvent('onkeypress', keypress_a, false);
                    win.removeEvent('onkeydown', keydown_a, false);
                    win.removeEvent('onkeyup', keyup_a, false);
                }
            }
            if (mouse_element == null) {
                myCanvas = null;
                mouse_element = document.createElement("div");
                mouse_element.setAttribute("style", "position:absolute; visibility:hidden; background: url('" + cursors_file + "') no-repeat; background-position: 0px -120px; width:24px; height:24px; ");
                mouse_type = -1;
                container_id.appendChild(mouse_element);
            }
        }

        function restoreCtrlMode()
        {
            if (container_id == null || canvas[2] == null) return;
            if (container_id) {
                for (i = 0; i < container_id.childNodes.length; i++) {
                    if (container_id.childNodes[i].nodeName == 'CANVAS' || container_id.childNodes[i].nodeName == 'canvas') {
                        var myCanvas = container_id.childNodes[i];
                        myCanvas.style["cursor"] = "default";
                        break;
                    }
                }
            }
            var doc = canvas[2].ownerDocument;
            var win = null;
            if (doc) {
                win = doc.defaultView || doc.parentWindow;
            }
            else {
                doc = container_id.ownerDocument;
                if (doc) {
                    win = doc.defaultView || doc.parentWindow;
                }
            }
            /*if (mouse_element) {
                container_id.removeChild(mouse_element);
                mouse_element = null;
                mouse_type = -1;
            }*/
            if (canvas[2].addEventListener) {
                log('control addEventListener');
                canvas[2].addEventListener("mousedown", mouseDownHandle, false);
                canvas[2].addEventListener("mousemove", mouseMoveHandle, false);
                canvas[2].addEventListener("mouseup", mouseUpHandle, false);
                canvas[2].addEventListener("dblclick", mouseDoubleClickHandle, false);
                canvas[2].addEventListener("DOMMouseScroll", domMouseScroll, false);
                canvas[2].addEventListener('mousewheel', mousewheel_l, false);
                if (win) {
                    win.addEventListener('keypress', keypress_l, false);
                    win.addEventListener('keydown', keydown_l, false);
                    win.addEventListener('keyup', keyup_l, false);
                }
            }
            else if (canvas[2].attachEvent) {
                log('control attachEvent');
                canvas[2].attachEvent("onmousedown", mouseDownHandle, false);
                canvas[2].attachEvent("onmousemove", mouseMoveHandle, false);
                canvas[2].attachEvent("onmouseup", mouseUpHandle, false);
                canvas[2].attachEvent("ondblclick", mouseDoubleClickHandle, false);
                canvas[2].attachEvent('mousewheel', mousewheel_a, false);
                canvas[2].attachEvent('onmousewheel', mousewheel_a, false);
                if (win) {
                    win.attachEvent('keypress', keypress_a, false);
                    win.attachEvent('keydown', keydown_a, false);
                    win.attachEvent('keyup', keyup_a, false);
                    win.attachEvent('onkeypress', keypress_a, false);
                    win.attachEvent('onkeydown', keydown_a, false);
                    win.attachEvent('onkeyup', keyup_a, false);
                }
            }
        }

        function changeDisplaySender(clicked_id) {
            var s_part_id = String(clicked_id);
            log('changeDisplaySender ' + clicked_id + ' current sender = ' + activePart);
            if (activePart == s_part_id) {
                return;
            }
            sender_changed = true;
            if (have_control[s_part_id] && !have_control[activePart]) {             // new one has control but old no
                log('changeDisplaySender restoreCtrlMode');
                restoreCtrlMode();
            }
            else if (!have_control[s_part_id] && have_control[activePart]) {        // new one has no control but old yes
                log('changeDisplaySender restoreNoCtrlMode');
                restoreNoCtrlMode();
            }
            activePart = s_part_id;
        }

        function changeDisplayApp(clicked_id) {
            log('changeDisplayApp ' + clicked_id + ' current sender = ' + activePart + ' ch=' + sender_changed);
            var s_app_id = String(clicked_id);
            if ((activeApp == s_app_id) && (sender_changed == false)) {
                return;
            }
            sender_changed = false;
            var l_activeApp = activeApp;
            activeApp = s_app_id;

            ctx[1].clearRect(0, 0, img_w[activePart][l_activeApp], img_h[activePart][l_activeApp]);

            canvas[0].width = img_w[activePart][activeApp];
            canvas[0].height = img_h[activePart][activeApp];
            canvas[0].style.width = img_w[activePart][activeApp] + 'px';
            canvas[0].style.height = img_h[activePart][activeApp] + 'px';

            canvas[1].width = img_w[activePart][activeApp];
            canvas[1].height = img_h[activePart][activeApp];
            canvas[1].style.width = img_w[activePart][activeApp] + 'px';
            canvas[1].style.height = img_h[activePart][activeApp] + 'px';

            if (imageData[activePart][activeApp]) {
                ctx[1].putImageData(imageData[activePart][activeApp], 0, 0);
                if (scaleImage && container_id) {
                    var scale_x, scale_y;
                    if (img_w[activeApp])
                        scale_x = parseInt(container_id.style.width, 10) / img_w[activePart][activeApp];
                    else
                        scale_x = 1;
                    if (img_h[activeApp])
                        scale_y = parseInt(container_id.style.height, 10) / img_h[activePart][activeApp];
                    else
                        scale_y = 1;
                    scale = (scale_x < scale_y ? scale_x : scale_y);
                    if (scale < 1) {
                        var tw, th;
                        if (scale > 0 && container_id.style.width && container_id.style.height) {
                            tw = Math.floor(img_w[activePart][activeApp] * scale); // target image width
                            th = Math.floor(img_h[activePart][activeApp] * scale); // target image height
                        }
                        else if (scale_x > 0 && scale_y > 0) {
                            tw = Math.floor(img_w[activePart][activeApp] * scale_x); // target image width
                            th = Math.floor(img_h[activePart][activeApp] * scale_y); // target image width
                        }
                        else {
                            tw = img_w[activePart][activeApp];
                            th = img_h[activePart][activeApp];
                        }
                        canvas[2].width = tw;
                        canvas[2].height = th;
                        canvas[2].style.width = tw + "px";
                        canvas[2].style.height = th + "px";
                        ctx[2].drawImage(canvas[1], 0, 0, tw, th);
                    }
                    else {
                        canvas[2].width = img_w[activePart][activeApp];
                        canvas[2].height = img_h[activePart][activeApp];
                        canvas[2].style.width = img_w[activePart][activeApp] + "px";
                        canvas[2].style.height = img_h[activePart][activeApp] + "px";
                        ctx[2].drawImage(canvas[1], 0, 0, img_w[activePart][activeApp], img_h[activePart][activeApp]);
                    }
                }
                else {
                    canvas[2].width = img_w[activePart][activeApp];
                    canvas[2].height = img_h[activePart][activeApp];
                    canvas[2].style.width = img_w[activePart][activeApp] + "px";
                    canvas[2].style.height = img_h[activePart][activeApp] + "px";
                    ctx[2].drawImage(canvas[1], 0, 0, img_w[activePart][activeApp], img_h[activePart][activeApp]);
                }
            }
        }

        function setOwnName(data) {
            sender_name = data;
            if (sender_name) sender_name_len = sender_name.length;
            else sender_name_len = 0;
            if (activePart != -1 && sender_name_len > 0) sendOwnName(0xff, activePart);
        }

        function fitToElement(remScaleImage) {
            log('fit_to_element = ' + scaleImage + ' r = ' + remScaleImage + ' act=' + activeApp + ' part=' + activePart + ' cont=' + container_id);
            scaleImage = remScaleImage;
            if (canvas[2] != null && activePart != -1 && activeApp != -1) {
                if (scaleImage && container_id) {
                    var scale_x, scale_y;
                    if (img_w[activePart][activeApp]) {
                        scale_x = parseInt(container_id.style.width || container_id.offsetWidth, 10) / img_w[activePart][activeApp];
                    }
                    else {
                        scale_x = 1;
                    }
                    if (img_h[activePart][activeApp]) {
                        scale_y = parseInt(container_id.style.height || container_id.offsetHeight, 10) / img_h[activePart][activeApp];
                    }
                    else {
                        scale_y = 1;
                    }
                    scale = (scale_x < scale_y ? scale_x : scale_y);
                    if (scale < 1) {
                        var tw, th;
                        if (scale > 0 && container_id.style.width && container_id.style.height) {
                            tw = Math.floor(img_w[activePart][activeApp] * scale); // target image width
                            th = Math.floor(img_h[activePart][activeApp] * scale); // target image height
                        }
                        else if (scale_x > 0 && scale_y > 0) {
                            tw = Math.floor(img_w[activePart][activeApp] * scale_x); // target image width
                            th = Math.floor(img_h[activePart][activeApp] * scale_y); // target image width
                        }
                        else {
                            tw = img_w[activePart][activeApp];
                            th = img_h[activePart][activeApp];
                        }
                        canvas[2].width = tw;
                        canvas[2].height = th;
                        canvas[2].style.width = tw + "px";
                        canvas[2].style.height = th + "px";
                        ctx[2].drawImage(canvas[1], 0, 0, tw, th);
                    }
                }
                else if (canvas[1] != null && canvas[1].width > 0 && canvas[1].height > 0) {
                    canvas[2].width = canvas[1].width;
                    canvas[2].height = canvas[1].height;
                    canvas[2].style.width = canvas[1].width + "px";
                    canvas[2].style.height = canvas[1].height + "px";
                    if (ctx[2]) ctx[2].drawImage(canvas[1], 0, 0, canvas[1].width, canvas[1].height);
                }
            }
        }

        function adjustImageToCanvas() {
            log('adjustImageToCanvas = ' + scaleImage + ' sender = ' + activePart + ' app = ' + activeApp);
            if (scaleImage && container_id && (activePart != -1) && (activeApp != -1)) {
                var scale_x, scale_y;
                if (img_w[activePart][activeApp]) {
                    scale_x = parseInt(container_id.style.width || container_id.offsetWidth, 10) / img_w[activePart][activeApp];
                }
                else {
                    scale_x = 1;
                }
                if (img_h[activePart][activeApp]) {
                    scale_y = parseInt(container_id.style.height || container_id.offsetHeight, 10) / img_h[activePart][activeApp];
                }
                else {
                    scale_y = 1;
                }
                scale = (scale_x < scale_y ? scale_x : scale_y);
                if (scale < 1) {
                    var tw, th;
                    if (scale > 0 && container_id.style.width && container_id.style.height) {
                        tw = Math.floor(img_w[activePart][activeApp] * scale); // target image width
                        th = Math.floor(img_h[activePart][activeApp] * scale); // target image height
                    }
                    else if (scale_x > 0 && scale_y > 0) {
                        tw = Math.floor(img_w[activePart][activeApp] * scale_x); // target image width
                        th = Math.floor(img_h[activePart][activeApp] * scale_y); // target image width
                    }
                    else {
                        tw = img_w[activePart][activeApp];
                        th = img_h[activePart][activeApp];
                    }
                    canvas[2].width = tw;
                    canvas[2].height = th;
                    canvas[2].style.width = tw + "px";
                    canvas[2].style.height = th + "px";
                    ctx[2].drawImage(canvas[1], 0, 0, tw, th);
                }
            }
        }

        function requestControl() {
            if (activePart == -1 || have_control[activePart]) return;
            log('request control l=' + sender_name_len + ' act=' + activePart);

            // Disable Request Control button and different style?
            var arrayMsg = new ArrayBuffer(36 + 1 + (sender_name_len << 1));
            var dmsg = new Uint8Array(arrayMsg);
            var t_seq = inno_seq++;
            dmsg[INNO_HDR_FLAGS] = 0xf0;
            dmsg[INNO_HDR_MSG_TYPE] = 133; // REQUEST_CONTROL
            dmsg[INNO_HDR_SEQ + 0] = (t_seq >> 8) & 0xff;
            dmsg[INNO_HDR_SEQ + 1] = t_seq & 0xff;
            dmsg[INNO_HDR_APPL_ID] = 0xff;
            dmsg[INNO_HDR_SENDER_ID + 0] = (sender_id >> 8) & 0xff;
            dmsg[INNO_HDR_SENDER_ID + 1] = sender_id & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 0] = (activePart >> 8) & 0xff;
            dmsg[INNO_HDR_RECEIVER_ID + 1] = activePart & 0xff;
            dmsg[INNO_HDR_LENGTH + 4] = (sender_name_len << 1);
            var nstr = sender_name;
            var ind_a = INNO_HDR_LENGTH + 5;
            for (var i = 0; i < sender_name_len; i++) {
                var c = nstr.charCodeAt(i);
                //log('name = ' + c);
                dmsg[ind_a + 0] = c & 0xff;
                dmsg[ind_a + 1] = (c >> 8) & 0xff;
                ind_a = ind_a + 2;
            }
            if (dataChannel) dataChannel.send(arrayMsg);
        }

        function readMsgCb(blob, length, params) {
            var msg = params[0];
            var imageRes = blob;
            var rx_sender = params[13];
            var index = INNO_HDR_SEQ_NUM + 2;  // INNO_HDR_SEQ_NUM+2;
            //log("message " + msg + " sender " + rx_sender);
            if (msg == 8) {  // DUMMY_MSG
                if (rx_apps[rx_sender][params[INDEX_APP_ID]] == 0) {
                    log('New application received ' + params[INDEX_APP_ID] + ' from ' + rx_sender);
                    rx_apps[rx_sender][params[INDEX_APP_ID]] = 1;
                    if ((app_name[rx_sender][params[INDEX_APP_ID]] != ("app_" + rx_sender + "_" + params[INDEX_APP_ID])) && (app_name[rx_sender][params[INDEX_APP_ID]] != "")) {
                        if (onCreateApp && (rx_tabs[rx_sender][params[INDEX_APP_ID]] == 0)) {
                            onCreateApp(rx_sender, params[INDEX_APP_ID], app_name[rx_sender][params[INDEX_APP_ID]]);
                            rx_tabs[rx_sender][params[INDEX_APP_ID]] = 1;
                        }
                    }
                    requestNewPicture(params[INDEX_APP_ID], rx_sender);
                    requestAppName(params[INDEX_APP_ID], rx_sender);
                    sendOwnName(params[INDEX_APP_ID], rx_sender);
                }
                else if (rx_apps[rx_sender][params[INDEX_APP_ID]] && (rx_tabs[rx_sender][params[INDEX_APP_ID]] == 0)) {
                    if (onCreateApp) {
                        if ((app_name[rx_sender][params[INDEX_APP_ID]] != ("app_" + rx_sender + "_" + params[INDEX_APP_ID])) && (app_name[rx_sender][params[INDEX_APP_ID]] != "")) {
                            onCreateApp(rx_sender, params[INDEX_APP_ID], app_name[rx_sender][params[INDEX_APP_ID]]);
                            rx_tabs[rx_sender][params[INDEX_APP_ID]] = 1;
                        }
                        else {
                            requestAppName(params[INDEX_APP_ID], rx_sender);
                        }
                    }
                }
            }
            else if (msg == 9) {   // NEW_PICTURE
                log('readMsgCb NEW_PICTURE');
                if (imageRes[index] == 0) {
                    var result = "";
                    for (var i = index + 2; i < (imageRes[index + 1] + (index + 2)) ; i++) {
                        if (imageRes[i]) result += String.fromCharCode(imageRes[i]);
                    }
                    remote_part = result;
                    index += (2 + imageRes[index + 1]);
                }
                if (index < length) {
                    if (imageRes[index] == 1) {
                        app_name[rx_sender][params[INDEX_APP_ID]] = "";
                        for (var i = index + 2; i < (imageRes[index + 1] + (index + 2)) ; i++) {
                            if (imageRes[i]) app_name[rx_sender][params[INDEX_APP_ID]] += String.fromCharCode(imageRes[i]);
                        }
                        if (onCreateApp) {
                            onCreateApp(rx_sender, params[INDEX_APP_ID], app_name[rx_sender][params[INDEX_APP_ID]]);
                            rx_tabs[rx_sender][params[INDEX_APP_ID]] = 1;
                        }
                    }
                }
                log('readMsgCb NEW_PICTURE(' + rx_sender + ', ' + app_name[rx_sender][params[INDEX_APP_ID]] + ') seq=' + params[14] + ' remote = ' + remote_part);
            }
            else if (msg == 10) {   // STOP_SHARING
                log('readMsgCb STOP_SHARING app=' + params[INDEX_APP_ID] + ' active=' + activeApp + ' sender=' + params[13] + ' target=' + params[15]);
                if (onRemoveApp) onRemoveApp(rx_sender, params[INDEX_APP_ID]);
                if (imageData[rx_sender][params[INDEX_APP_ID]]) imageData[rx_sender][params[INDEX_APP_ID]] = null;
                rx_apps[rx_sender][params[INDEX_APP_ID]] = 0;
                rx_tabs[rx_sender][params[INDEX_APP_ID]] = 0;
                img_w[rx_sender][params[INDEX_APP_ID]] = 0;
                img_h[rx_sender][params[INDEX_APP_ID]] = 0;
                app_name[rx_sender][params[INDEX_APP_ID]] = "app_" + rx_sender + "_" + params[INDEX_APP_ID];
                start_processing[rx_sender] = true;
                last_proc_seq[rx_sender] = 0;
                have_control[rx_sender] = false;

                if ((activePart == rx_sender) && (activeApp == params[INDEX_APP_ID])) {
                    ctx[2].clearRect(0, 0, canvas[2].width, canvas[2].height);

                    activeApp = -1;
                    activePart = -1;
                    for (var i = 0; (i < 256 && (activeApp == -1)) ; i++) {
                        for (var j = 0; j < 256 ; j++) {
                            if (rx_apps[j][i]) {
                                activePart = j;
                                activeApp = i;
                                if (imageData[activePart][activeApp]) {
                                    canvas[1].width = img_w[activePart][activeApp];
                                    canvas[1].height = img_h[activePart][activeApp];
                                    canvas[1].style.width = img_w[activePart][activeApp] + "px";
                                    canvas[1].style.height = img_h[rx_sender][activeApp] + "px";
                                    ctx[1].putImageData(imageData[activePart][activeApp], 0, 0);

                                    if (scaleImage && container_id) {
                                        var scale_x, scale_y;
                                        if (img_w[activePart][activeApp]) {
                                            scale_x = parseInt(container_id.style.width || container_id.offsetWidth, 10) / img_w[activePart][activeApp];
                                        }
                                        else {
                                            scale_x = 1;
                                        }
                                        if (img_h[activePart][activeApp]) {
                                            scale_y = parseInt(container_id.style.height || container_id.offsetHeight, 10) / img_h[activePart][activeApp];
                                        }
                                        else {
                                            scale_y = 1;
                                        }
                                        scale = (scale_x < scale_y ? scale_x : scale_y);
                                        if (scale < 1) {
                                            var tw, th;
                                            if (scale > 0 && container_id.style.width && container_id.style.height) {
                                                tw = Math.floor(img_w[activePart][activeApp] * scale); // target image width
                                                th = Math.floor(img_h[activePart][activeApp] * scale); // target image height
                                            }
                                            else if (scale_x > 0 && scale_y > 0) {
                                                tw = Math.floor(img_w[activePart][activeApp] * scale_x); // target image width
                                                th = Math.floor(img_h[activePart][activeApp] * scale_y); // target image width
                                            }
                                            else {
                                                tw = img_w[activePart][activeApp];
                                                th = img_h[activePart][activeApp];
                                            }
                                            canvas[2].width = tw;
                                            canvas[2].height = th;
                                            canvas[2].style.width = tw + "px";
                                            canvas[2].style.height = th + "px";
                                            ctx[2].drawImage(canvas[1], 0, 0, tw, th);
                                        }
                                        else {
                                            canvas[2].width = img_w[activePart][activeApp];
                                            canvas[2].height = img_h[activePart][activeApp];
                                            canvas[2].style.width = img_w[activePart][activeApp] + "px";
                                            canvas[2].style.height = img_h[activePart][activeApp] + "px";
                                            ctx[2].drawImage(canvas[1], 0, 0, img_w[activePart][activeApp], img_h[activePart][activeApp]);
                                        }
                                    }
                                    else {
                                        canvas[2].width = img_w[activePart][activeApp];
                                        canvas[2].height = img_h[activePart][activeApp];
                                        canvas[2].style.width = img_w[activePart][activeApp] + "px";
                                        canvas[2].style.height = img_h[activePart][activeApp] + "px";
                                        ctx[2].drawImage(canvas[1], 0, 0, img_w[activePart][activeApp], img_h[activePart][activeApp]);
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
                else if (activeApp != -1 && params[13] == 0xffff) {
                    log('message from conference interface! t=' + params[15]);
                    if (params[15] < 256) {
                        for (var j = 0; j < 256; j++) {
                            if (imageData[params[15]][j]) imageData[params[15]][j] = null;
                            rx_apps[params[15]][j] = 0;
                            rx_tabs[params[15]][j] = 0;
                            img_w[params[15]][j] = 0;
                            img_h[params[15]][j] = 0;
                            app_name[params[15]][j] = "app_" + params[15] + "_" + j;
                            if (onRemoveApp) onRemoveApp(params[15], j);
                        }
                        sharingQueue[params[15]] = [];
                        waitingQueue[params[15]] = 0;
                        start_processing[params[15]] = true;
                        last_proc_seq[params[15]] = 0;
                        have_control[params[15]] = false;
                    }
                    if (params[15] == activePart) {
                        ctx[2].clearRect(0, 0, canvas[2].width, canvas[2].height);
                        activeApp = -1;
                    }
                }
            }
            else if (msg == 12) {   // SEND_MOUSE_TYPE
                if (activePart == -1) return;
                //log("message " + msg + " pos " + params[1] + "x" + params[2] + " mouse:" + mouse_type + " x:" + m_offset_x + " y:" + m_offset_y + " sender:" + activePart);
                if (have_control[activePart]) {
                    if (myCanvas == null) {
                        if (container_id) {
                            for (i = 0; i < container_id.childNodes.length; i++) {
                                if (container_id.childNodes[i].nodeName == 'CANVAS' || container_id.childNodes[i].nodeName == 'canvas') {
                                    myCanvas = container_id.childNodes[i];
                                    break;
                                }
                            }
                        }
                    }
                    if (myCanvas) {
                        if (mouse_type != params[14]) {
                            switch (params[14]) {
                                case CURSOR_IDC_ARROW:
                                    myCanvas.style["cursor"] = "default";
                                    break;
                                case CURSOR_IDC_HAND:
                                    myCanvas.style["cursor"] = "pointer";
                                    break;
                                case CURSOR_IDC_WAIT:
                                    myCanvas.style["cursor"] = "wait";
                                    break;
                                case CURSOR_IDC_APPSTARTING:
                                    myCanvas.style["cursor"] = "progress";
                                    break;
                                case CURSOR_IDC_IBEAM:
                                    myCanvas.style["cursor"] = "text";
                                    break;
                                case CURSOR_IDC_CROSS:
                                    myCanvas.style["cursor"] = "crosshair";
                                    break;
                                case CURSOR_IDC_HELP:
                                    myCanvas.style["cursor"] = "help";
                                    break;
                                case CURSOR_IDC_NO:
                                    myCanvas.style["cursor"] = "not-allowed";
                                    break;
                                case CURSOR_IDC_SIZEALL:
                                    myCanvas.style["cursor"] = "move";
                                    break;
                                case CURSOR_IDC_SIZENESW:
                                    myCanvas.style["cursor"] = "sw-resize";
                                    break;
                                case CURSOR_IDC_SIZENS:
                                    myCanvas.style["cursor"] = "n-resize";
                                    break;
                                case CURSOR_IDC_SIZENWSE:
                                    myCanvas.style["cursor"] = "nw-resize";
                                    break;
                                case CURSOR_IDC_SIZEWE:
                                    myCanvas.style["cursor"] = "w-resize";
                                    break;
                                case CURSOR_IDC_UPARROW:
                                    myCanvas.style["cursor"] = "default";
                                    break;
                                case CURSOR_IDC_VSPLIT:
                                    myCanvas.style["cursor"] = "row-resize";
                                    break;
                                case CURSOR_IDC_HSPLIT:
                                    myCanvas.style["cursor"] = "col-resize";
                                    break;
                                case CURSOR_IDC_H1SPLIT:
                                    myCanvas.style["cursor"] = "col-resize";
                                    break;
                                case CURSOR_IDC_H2SPLIT:
                                    myCanvas.style["cursor"] = "col-resize";
                                    break;
                                case CURSOR_IDC_V2SPLIT:
                                    myCanvas.style["cursor"] = "row-resize";
                                    break;
                                default:
                                    myCanvas.style["cursor"] = "default";
                                    break;
                            }
                            mouse_type = params[14];
                        }
                    }
                }
                else if ((activePart == rx_sender) && (mouse_element != null)) {
                    if (mouse_type != params[14]) {
                        switch(params[14]) {
                            case CURSOR_IDC_ARROW:
                                m_offset_x = 5;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: 0px -120px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_HAND:
                                m_offset_x = 0;
                                m_offset_y = 5;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: 0px -24px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_WAIT:
                                m_offset_x = 5;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: 0px -96px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_APPSTARTING:
                                m_offset_x = 5;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: 0px -48px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_IBEAM:
                                m_offset_x = 5;
                                m_offset_y = 4;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: 0px -72px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_CROSS:
                                m_offset_x = 5;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: 0px -144px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_HELP:
                                m_offset_x = 5;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -24px -120px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_NO:
                                m_offset_x = 5;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -24px -48px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_SIZEALL:
                                m_offset_x = -5;
                                m_offset_y = -5;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: 0px 0px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_SIZENESW:
                                m_offset_x = -5;
                                m_offset_y = -5;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -72px 0px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_SIZENS:
                                m_offset_x = -5;
                                m_offset_y = -5;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -48px 0px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_SIZENWSE:
                                m_offset_x = -5;
                                m_offset_y = -5;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -96px 0px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_SIZEWE:
                                m_offset_x = -5;
                                m_offset_y = -5;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -24px 0px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_UPARROW:
                                m_offset_x = 5;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -120px 0px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_VSPLIT:
                                m_offset_x = 8;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -48px -72px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_HSPLIT:
                                m_offset_x = 5;
                                m_offset_y = 9;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -72px -72px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_H1SPLIT:
                                m_offset_x = 5;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -72px -72px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_H2SPLIT:
                                m_offset_x = 5;
                                m_offset_y = 3;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -72px -72px; width:24px; height:24px; ");
                                break;
                            case CURSOR_IDC_V2SPLIT:
                                m_offset_x = 5;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: -48px -72px; width:24px; height:24px; ");
                                break;
                            default:
                                m_offset_x = 5;
                                m_offset_y = 6;
                                mouse_element.setAttribute("style", "position:absolute; visibility:visible; background: url('" + cursors_file + "') no-repeat; background-position: 0px -120px; width:24px; height:24px; ");
                                break;
                        }
                        mouse_type = params[14];
                    }
                    var scale_x = 1, scale_y = 1;
                    if (scaleImage && container_id) {
                        if (img_w[rx_sender][activeApp]) {
                            scale_x = parseInt(container_id.style.width || container_id.offsetWidth, 10) / img_w[rx_sender][activeApp];
                        }
                        if (img_h[rx_sender][activeApp]) {
                            scale_y = parseInt(container_id.style.height || container_id.offsetHeight, 10) / img_h[rx_sender][activeApp];
                        }
                    }
                    mouse_element.style.left = ((params[1] + m_offset_x) * scale_x) + "px";
                    mouse_element.style.top = ((params[2] + m_offset_y) * scale_y) + "px";
                }
            }
        }

        function readPngCb(blob, params) {
            var rx_sender = params[13];
            var img_data = imageData[rx_sender][params[INDEX_APP_ID]].data;
            var imageRes = blob;
            var index = INNO_HDR_LENGTH + 4;  // + INNO_HDR_PKT_LEN
            var pixels;
            if (params[9] == PNG_COMP) { // PNG
                if (imageRes[index + 1] != 80 || imageRes[index + 2] != 78 || imageRes[index + 3] != 71) {   // PNG
                    log('Unknown PNG format...' + imageRes[index + 1] + imageRes[index + 2] + imageRes[index + 3]);
                }
                else {
                    var png = new innovaphone.applicationSharing.PNG(imageRes, index);
                    pixels = png.decode();
                    for (var l = 0; l < (params[11] + 1) ; l++) {
                        var k = 0;
                        var offset = (params[2] * params[5] + (l * params[3] + params[1])) * 4;
                        for (var i = 0; i < params[4]; i++) {
                            var n_offset = offset + (i * params[5] * 4);
                            for (var j = 0; j < (params[3] * 4) ; j += 4) {
                                // i+3 is alpha (the fourth element)
                                img_data[n_offset + j + 0] = pixels[k++];
                                img_data[n_offset + j + 1] = pixels[k++];
                                img_data[n_offset + j + 2] = pixels[k++];
                                img_data[n_offset + j + 3] = pixels[k++];        // alpha
                            }
                        }
                    }
                }
            }
            else {
                var j = new innovaphone.applicationSharing.JpegImage();
                j.parse(imageRes, index);
                for (var l = 0; l < (params[11] + 1) ; l++) {
                    var offset = (params[2] * params[5] + (l * params[3] + params[1])) * 4;
                    j.copyToImageDataOffset(imageData[rx_sender][params[10]], offset, params[3], params[4]);
                }
            }
            if ((rx_sender == activePart) && (params[INDEX_APP_ID] == activeApp)) {
                if (params[8] & END_BIT_IMG) {
                    ctx[1].putImageData(imageData[rx_sender][activeApp], 0, 0);
                    if (scaleImage && container_id) {
                        var scale_x, scale_y;
                        if (img_w[rx_sender][activeApp])
                            scale_x = parseInt(container_id.style.width || container_id.offsetWidth, 10) / img_w[rx_sender][activeApp];
                        else
                            scale_x = 1;
                        if (img_h[rx_sender][activeApp])
                            scale_y = parseInt(container_id.style.height || container_id.offsetHeight, 10) / img_h[rx_sender][activeApp];
                        else
                            scale_y = 1;
                        scale = (scale_x < scale_y ? scale_x : scale_y);
                        if (scale < 1) {
                            var tw, th;
                            if (scale > 0 && container_id.style.width && container_id.style.height) {
                                tw = Math.floor(img_w[rx_sender][activeApp] * scale); // target image width
                                th = Math.floor(img_h[rx_sender][activeApp] * scale); // target image height
                            }
                            else if (scale_x > 0 && scale_y > 0) {
                                tw = Math.floor(img_w[rx_sender][activeApp] * scale_x); // target image width
                                th = Math.floor(img_h[rx_sender][activeApp] * scale_y); // target image width
                            }
                            else {
                                tw = img_w[rx_sender][activeApp];
                                th = img_h[rx_sender][activeApp];
                            }
                            canvas[2].width = tw;
                            canvas[2].height = th;
                            canvas[2].style.width = tw + "px";
                            canvas[2].style.height = th + "px";
                            ctx[2].drawImage(canvas[1], 0, 0, tw, th);
                        }
                        else {
                            canvas[2].width = params[5];
                            canvas[2].height = params[6];
                            canvas[2].style.width = params[5] + "px";
                            canvas[2].style.height = params[6] + "px";
                            ctx[2].drawImage(canvas[1], 0, 0, params[5], params[6]);
                        }
                    }
                    else {
                        ctx[2].drawImage(canvas[1], 0, 0, params[5], params[6]);
                    }
                }
            }
        }

        // public
        var close = function () {
            log('close app sharing');
            dataChannel = null;
            first_pkt_rx = false;
            is_processing = false;
            sender_changed = false;
            if (myTimer != null) clearInterval(myTimer);
            myTimer = null;
            if (ctx[2] != null) ctx[2].clearRect(0, 0, canvas[2].width, canvas[2].height);
            activeApp = -1;
            activePart = -1;
            for (var i = 0; i < 256; i++) {
                for (var j = 0; j < 256; j++) {
                    if (onRemoveApp && (rx_tabs[i][j] == 1)) onRemoveApp(i, j);
                    imageData[i][j] = null;
                    rx_apps[i][j] = 0;
                    rx_tabs[i][j] = 0;
                    img_w[i][j] = 0;
                    img_h[i][j] = 0;
                    app_name[i][j] = "app_" + i + "_" + j;
                }
                sharingQueue[i] = [];
                waitingQueue[i] = 0;
                start_processing[i] = true;
                last_proc_seq[i] = 0;
                have_control[i] = false;
            }
        }

        var init = function (data_channel) {
            dataChannel = data_channel;
            process_timer = 0;
            if (myTimer == null) myTimer = setInterval(processingInterval, 50);
            log('Init application Sharing. Prefix=' + innovaphone.applicationSharing.PathPrefix);
            first_pkt_rx = false;
            is_processing = false;
            for (var i = 0; i < 256; i++) {
                for (var j = 0; j < 256; j++) {
                    imageData[i][j] = null;
                    rx_apps[i][j] = 0;
                    rx_tabs[i][j] = 0;
                    img_w[i][j] = 0;
                    img_h[i][j] = 0;
                    app_name[i][j] = "app_" + i + "_" + j;
                }
                start_processing[i] = true;
                last_proc_seq[i] = 0;
                sharingQueue[i] = [];
                waitingQueue[i] = 0;
            }
            if (ctx[2] != null && canvas[2] != null) {
                ctx[2].clearRect(0, 0, canvas[2].width, canvas[2].height);
            }
            for (var i = 0; i < 3; i++) {
                if (canvas[i] == null) continue;
                canvas[i].width = getWidth() + "px";
                canvas[i].height = (getHeight() - 30) + "px";
                canvas[i].style.width = getWidth() + "px";
                canvas[i].style.height = (getHeight() - 30) + "px";
            }
            if (canvas[2].style.setProperty) {
                canvas[2].style.setProperty("display", "block", null);
                canvas[2].style.setProperty("visibility", "visible", null);
            }
            else {
                canvas[2].style.setAttribute("display", "block");
                canvas[2].style.setAttribute("visibility", "visible");
            }
            dataChannel = data_channel;
            if (dataChannel) {
                log('Application Sharing initialised! s = ' + activePart + ' a = ' + activeApp);
            }
            else
                log('Application Sharing initialised without dataChanel!');
            if (container_id != null) {
                var myCanvas = null;
                log('Canvas container already defined!');
                for (i = 0; i < container_id.childNodes.length; i++) {
                    if (container_id.childNodes[i].nodeName == 'CANVAS' || container_id.childNodes[i].nodeName == 'canvas') {
                        myCanvas = container_id.childNodes[i];
                        break;
                    }
                }
                if (myCanvas != null) {
                    container_id.removeChild(myCanvas);
                    log('init: canvas removed for container!');
                }
                canvas[2].setAttribute("style", "display: block; visibility: visible;");
                if (mouse_element == null) {
                    mouse_element = document.createElement("div");
                    mouse_element.setAttribute("style", "position:absolute; visibility:hidden; background: url('" + cursors_file + "') no-repeat; background-position: 0px -120px; width:24px; height:24px; ");
                    mouse_type = -1;
                }
                container_id.appendChild(mouse_element);
                container_id.appendChild(canvas[2]);
                if ((activePart >= 0) && (activeApp >= 0) && (imageData[activePart][activeApp])) {
                    canvas[2].width = img_w[activePart][activeApp];
                    canvas[2].height = img_h[activePart][activeApp];
                    canvas[2].style.width = img_w[activePart][activeApp] + "px";
                    canvas[2].style.height = img_h[activePart][activeApp] + "px";
                    ctx[2].drawImage(canvas[1], 0, 0, img_w[activePart][activeApp], img_h[activePart][activeApp]);
                }
            }
        }

        var setContainer = function (containerId) {
            if (containerId != null) {
                if (containerId == container_id) {  // after a renegotiation container remains equal...
                    var myCanvas = null;
                    for (i = 0; i < container_id.childNodes.length; i++) {
                        if (container_id.childNodes[i].nodeName == 'CANVAS' || container_id.childNodes[i].nodeName == 'canvas') {
                            myCanvas = container_id.childNodes[i];
                            break;
                        }
                    }
                    if (myCanvas != null) {
                        container_id.removeChild(myCanvas);
                        log('set: canvas removed for container!');
                    }
                }
                container_id = containerId;
                if (canvas[2] != null) {
                    canvas[2].setAttribute("style", "display: block; visibility: visible;");
                    if ((activePart >= 0) && (activeApp >= 0) && (imageData[activePart][activeApp])) {
                        canvas[2].width = img_w[activePart][activeApp];
                        canvas[2].height = img_h[activePart][activeApp];
                        canvas[2].style.width = img_w[activePart][activeApp] + "px";
                        canvas[2].style.height = img_h[activePart][activeApp] + "px";
                        ctx[2].drawImage(canvas[1], 0, 0, img_w[activePart][activeApp], img_h[activePart][activeApp]);
                    }
                    if (mouse_element == null) {
                        mouse_element = document.createElement("div");
                        mouse_element.setAttribute("style", "position:absolute; visibility:hidden; background: url('" + cursors_file + "') no-repeat; background-position: 0px -120px; width:24px; height:24px; ");
                        mouse_type = -1;
                    }
                    container_id.appendChild(mouse_element);
                    container_id.appendChild(canvas[2]);
                }
                log("init application sharing display activePart = " + activePart + " dim = " + (containerId.style.width || containerId.offsetWidth) + "x" + (containerId.style.height || container_id.offsetHeight) + ' scale = ' + scaleImage);
            }
            else {
                if (container_id) {
                    var myCanvas = null;
                    for (i = 0; i < container_id.childNodes.length; i++) {
                        if (container_id.childNodes[i].nodeName == 'CANVAS' || container_id.childNodes[i].nodeName == 'canvas') {
                            myCanvas = container_id.childNodes[i];
                            break;
                        }
                    }
                    if (myCanvas != null) {
                        container_id.removeChild(myCanvas);
                        log('unset: canvas removed for container!');
                    }
                    container_id = null;
                    for (var i = 0; i < 256; i++) {
                        for (var j = 0; j < 256; j++) {
                            rx_tabs[i][j] = 0;
                        }
                    }
                }
            }
        }

        var recv = function (appData) {
            /*if (((num_packets_rx++) & 0x7f) == 0x40) {
                log('Data received:' + num_packets_rx + ' p:' + is_processing + ' t:' + process_timer);
            }*/
            if (first_pkt_rx == false) {
                log('first message rx');
                first_pkt_rx = true;
            }
            if (appData instanceof ArrayBuffer) {
                var uint8View = new Uint8Array(appData);
                var reorder = false;
                var rx_sender = (uint8View[INNO_HDR_SENDER_ID] << 8 | uint8View[INNO_HDR_SENDER_ID + 1]);
                if (rx_sender == 0xffff) {
                    var rx_target = (uint8View[INNO_HDR_RECEIVER_ID] << 8 | uint8View[INNO_HDR_RECEIVER_ID + 1]);
                    log('message from conference interface! t=' + rx_target);
                    if (activeApp != -1) {
                        if (rx_target < 256) {
                            for (var j = 0; j < 256; j++) {
                                if (imageData[rx_target][j]) imageData[rx_target][j] = null;
                                rx_apps[rx_target][j] = 0;
                                rx_tabs[rx_target][j] = 0;
                                img_w[rx_target][j] = 0;
                                img_h[rx_target][j] = 0;
                                app_name[rx_target][j] = "app_" + rx_target + "_" + j;
                                if (onRemoveApp) onRemoveApp(rx_target, j);
                            }
                            sharingQueue[rx_target] = [];
                            waitingQueue[rx_target] = 0;
                            start_processing[rx_target] = true;
                            last_proc_seq[rx_target] = 0;
                            have_control[rx_target] = false;
                        }
                        if (rx_target == activePart) {
                            ctx[2].clearRect(0, 0, canvas[2].width, canvas[2].height);
                            activeApp = -1;
                        }
                    }
                    return;
                }
                if (rx_sender > 255) return;
                var seq = (uint8View[INNO_HDR_SEQ] << 8 | uint8View[INNO_HDR_SEQ + 1]);
                if ((start_processing[rx_sender] == false) && (seq <= last_proc_seq[rx_sender]) && (last_proc_seq[rx_sender] - seq < 32768)) {
                    //log('old sequence ' + seq + ' <= ' + last_proc_seq[rx_sender]);
                    return;
                }
                var i = 0;
                // Only check if arrived sequence is smaller than last item in the array
                var q_length = sharingQueue[rx_sender].length; 
                if ((q_length > 0) && (seq <= sharingQueue[rx_sender][q_length - 1].seq)) {
                    for (i = 0; i < q_length; i++) {
                        if (seq == sharingQueue[rx_sender][i].seq) {
                            //log('duplicated sequence ' + seq);
                            return;
                        }
                        else if (seq < sharingQueue[rx_sender][i].seq) {
                            //log('reorder needed r=' + seq + ' q=' + sharingQueue[rx_sender][i].seq + ' index=' + i);
                            reorder = true;
                            break;
                        }
                    }
                }
                if (activePart == -1) {
                    activePart = rx_sender;
                }
                var node = new _AppSharingNode(uint8View, (uint8View[INNO_HDR_SEQ] << 8 | uint8View[INNO_HDR_SEQ + 1]), process_timer);

                if (reorder) {
                    if (i == 0) {
                        sharingQueue[rx_sender].unshift(node);
                    }
                    else {
                        var temp_start = sharingQueue[rx_sender].slice(0, i);
                        var temp_end = sharingQueue[rx_sender].slice(i);

                        sharingQueue[rx_sender] = temp_start;
                        sharingQueue[rx_sender].push(node);
                        sharingQueue[rx_sender].concat(temp_end);
                    }
                }
                else {
                    sharingQueue[rx_sender].push(node);
                }
                processingNode(rx_sender);
            }
        }

        function mousewheel_l(e) {
            if ((activePart == -1) || !have_control[activePart])
            if (!e) var e = window.event;
            if (mouseWheel(e) == false) {
                e.stopPropagation();
                e.preventDefault();
                e.cancelBubble = false;
            }
        }

        function mousewheel_a(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            if (!e) var e = window.event;
            if (mouseWheel(e) == false) {
                e.returnValue = false;
                e.cancelBubble = true;
            }
        }

        function keyup_l(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            //log('keyup_l');

            if (!e) var e = window.event;
            if (keyUp(e) == false) {
                e.stopPropagation();
                e.preventDefault();
                e.cancelBubble = false;
            }
        }

        function keyup_a(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            //log('keyup_a');

            if (!e) var e = window.event;
            if (keyUp(e) == false) {
                e.returnValue = false;
                e.cancelBubble = true;
            }
        }

        function keydown_l(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            //log('keydown_l');

            if (!e) var e = window.event;
            if (keyDown(e) == false) {
                e.stopPropagation();
                e.preventDefault();
                e.cancelBubble = false;
            }
        }

        function keydown_a(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            //log('keydown_a');

            if (!e) var e = window.event;
            if (keyDown(e) == false) {
                e.returnValue = false;
                e.cancelBubble = true;
            }
        }

        function keypress_l(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            //log('keypress_l');

            if (!e) var e = window.event;
            if (keyPress(e, 'keypress_l') == false) {
                e.stopPropagation();
                e.preventDefault();
                e.cancelBubble = false;
            }
        }

        function keypress_a(e) {
            if ((activePart == -1) || !have_control[activePart]) return;
            //log('keypress_a');

            if (!e) var e = window.event;
            if (keyPress(e, 'keypress_a') == false) {
                e.returnValue = false;
                e.cancelBubble = true;
            }
        }

        var processingNode = function (rx_sender) {
            //log('processingNode ' + rx_sender + ' proc ' + is_processing + ' l=' + sharingQueue[rx_sender].length + ' t=' + process_timer);
            if (is_processing == true) {
                waitingQueue[rx_sender] = 1;
                return;
            }
            is_processing = true;

            while ((sharingQueue[rx_sender].length > 0) && ((process_timer - sharingQueue[rx_sender][0].timer) > 3)) {  // 150 msec.
                var node = sharingQueue[rx_sender].shift();
                //log('proc seq ' + node.seq + ' timer = ' + process_timer + ',' + node.timer + ' q=' + sharingQueue[rx_sender].length);
                if (start_processing[rx_sender]) {
                    start_processing[rx_sender] = false;
                    last_proc_seq[rx_sender] = node.seq - 1;
                }
                if ((last_proc_seq[rx_sender] + 1) != node.seq) {
                    var num_lost = (65535 + node.seq - last_proc_seq[rx_sender]) & 0xffff;
                    //log('report missing seq[' + rx_sender + '] = ' + node.seq + ' last = ' + (last_proc_seq[rx_sender] + 1) + ' timer = ' + process_timer + ',' + node.timer + ' num = ' + num_lost);
                    reportPacketLost(last_proc_seq[rx_sender] + 1, num_lost, rx_sender);
                }

                var uint8View = node.msg;
                var params = new Array(32);

                params[0] = uint8View[INNO_HDR_MSG_TYPE];
                params[1] = uint8View[INNO_HDR_X_COOR] << 8 | uint8View[INNO_HDR_X_COOR + 1];
                params[2] = uint8View[INNO_HDR_Y_COOR] << 8 | uint8View[INNO_HDR_Y_COOR + 1];
                params[3] = ((uint8View[INNO_HDR_X_DIM] << 8) & 0xff00) | (uint8View[INNO_HDR_X_DIM + 1] & 0xff);
                params[4] = uint8View[INNO_HDR_Y_DIM] << 8 | uint8View[INNO_HDR_Y_DIM + 1];
                params[5] = uint8View[INNO_HDR_X_SIZE] << 8 | uint8View[INNO_HDR_X_SIZE + 1];
                params[6] = uint8View[INNO_HDR_Y_SIZE] << 8 | uint8View[INNO_HDR_Y_SIZE + 1];
                params[7] = uint8View[INNO_HDR_CRC_PNG256] << 24 | uint8View[INNO_HDR_CRC_PNG256 + 1] << 16 | uint8View[INNO_HDR_CRC_PNG256 + 2] << 8 | uint8View[INNO_HDR_CRC_PNG256 + 3];
                params[8] = uint8View[INNO_HDR_FLAGS] & (END_BIT_IMG | START_BIT_IMG);
                params[9] = uint8View[INNO_HDR_FLAGS] & 0xf;
                params[INDEX_APP_ID] = uint8View[INNO_HDR_APPL_ID];
                params[11] = uint8View[INNO_HDR_NUM_EQUAL] << 24 | uint8View[INNO_HDR_NUM_EQUAL + 1] << 16 | uint8View[INNO_HDR_NUM_EQUAL + 2] << 8 | uint8View[INNO_HDR_NUM_EQUAL + 3];
                params[12] = uint8View[INNO_HDR_RAW_COLOR] << 24 | uint8View[INNO_HDR_RAW_COLOR + 1] << 16 | uint8View[INNO_HDR_RAW_COLOR + 2] << 8 | uint8View[INNO_HDR_RAW_COLOR + 3];
                params[13] = uint8View[INNO_HDR_SENDER_ID] << 8 | uint8View[INNO_HDR_SENDER_ID + 1];
                params[14] = uint8View[INNO_HDR_SEQ_NUM] << 8 | uint8View[INNO_HDR_SEQ_NUM + 1];
                params[15] = uint8View[INNO_HDR_RECEIVER_ID] << 8 | uint8View[INNO_HDR_RECEIVER_ID + 1];

                var rx_sender = params[13];

                if (params[0] == BLOCK_MSG || params[0] == BLOCK_MSG_256 || params[0] == PLAIN_MSG) {
                    //log('Image ' + params[1] + 'x' + params[2] + ' ' + params[3] + 'x' + params[4] + ' ' + params[5] + 'x' + params[6]);
                    //log('Image ' + uint8View[INNO_HDR_X_DIM] + ' ' + uint8View[INNO_HDR_X_DIM + 1] + ' ' + uint8View[INNO_HDR_Y_DIM] + ' ' + uint8View[INNO_HDR_Y_DIM + 1]);
                    if (rx_apps[rx_sender][params[INDEX_APP_ID]] == 0) {
                        log('New application received ' + params[INDEX_APP_ID] + ' sender = ' + rx_sender + ' act = ' + activePart);
                        rx_apps[rx_sender][params[INDEX_APP_ID]] = 1;

                        requestNewPicture(params[INDEX_APP_ID], rx_sender);
                        requestAppName(params[INDEX_APP_ID], rx_sender);
                        sendOwnName(params[INDEX_APP_ID], rx_sender);
                    }
                    if ((params[5] != img_w[rx_sender][params[INDEX_APP_ID]]) || (params[6] != img_h[rx_sender][params[INDEX_APP_ID]])) {
                        log('dimensions changed(' + rx_sender + ', ' + params[INDEX_APP_ID] + ') ' + params[5] + 'x' + params[6] + ' active app = ' + activeApp + ' active sender = ' + activePart);
                        if (imageData[rx_sender][params[INDEX_APP_ID]]) imageData[rx_sender][params[INDEX_APP_ID]] = null;
                        imageData[rx_sender][params[INDEX_APP_ID]] = ctx[0].createImageData(params[5], params[6]);
                        img_w[rx_sender][params[INDEX_APP_ID]] = params[5];
                        img_h[rx_sender][params[INDEX_APP_ID]] = params[6];
                        if ((activePart == rx_sender) && ((activeApp == -1) || (params[INDEX_APP_ID] == activeApp))) {
                            canvas[0].width = params[5];
                            canvas[0].height = params[6];
                            canvas[0].style.width = params[5] + "px";
                            canvas[0].style.height = params[6] + "px";

                            canvas[1].width = params[5];
                            canvas[1].height = params[6];
                            canvas[1].style.width = params[5] + "px";
                            canvas[1].style.height = params[6] + "px";

                            if (scaleImage && container_id) {
                                var scale_x, scale_y;
                                if (params[5]) {
                                    scale_x = parseInt(container_id.style.width || container_id.offsetWidth, 10) / params[5];
                                }
                                else {
                                    scale_x = 1;
                                }
                                if (params[6]) {
                                    scale_y = parseInt(container_id.style.height || container_id.offsetHeight, 10) / params[6];
                                }
                                else {
                                    scale_y = 1;
                                }
                                scale = (scale_x < scale_y ? scale_x : scale_y);
                                if (scale < 1) {
                                    var tw, th;
                                    if (scale > 0 && container_id.style.width && container_id.style.height) {
                                        tw = Math.floor(params[5] * scale); // target image width
                                        th = Math.floor(params[6] * scale); // target image height
                                    }
                                    else if (scale_x > 0 && scale_y > 0) {
                                        tw = Math.floor(params[5] * scale_x); // target image width
                                        th = Math.floor(params[6] * scale_y); // target image width
                                    }
                                    else {
                                        tw = params[5];
                                        th = params[6];
                                    }
                                    canvas[2].width = tw;
                                    canvas[2].height = th;
                                    canvas[2].style.width = tw + "px";
                                    canvas[2].style.height = th + "px";
                                }
                                else {
                                    canvas[2].width = params[5];
                                    canvas[2].height = params[6];
                                    canvas[2].style.width = params[5] + "px";
                                    canvas[2].style.height = params[6] + "px";
                                }
                                ctx[2].drawImage(canvas[1], 0, 0, canvas[2].width, canvas[2].height);
                            }
                            else {
                                canvas[2].width = params[5];
                                canvas[2].height = params[6];
                                canvas[2].style.width = params[5] + "px";
                                canvas[2].style.height = params[6] + "px";
                            }

                            activeApp = params[INDEX_APP_ID];
                            log('activeApp = ' + activeApp);

                            if (onResizeApp) onResizeApp();
                        }
                    }
                    //log('Coordinates (' + params[1] + ',' + params[2] + '),(' + params[3] + ',' + params[4] + '),(' + params[5] + ',' + params[6] + ') ' + params[7]);
                    if (params[0] == PLAIN_MSG) {
                        //log('PLAIN Message ' + params[1] + 'x' + params[2] + ' ' + params[3] + 'x' + params[4]);
                        var raw_value = params[12];
                        var offset = (params[2] * params[5] + params[1]) * 4;
                        var img_data = imageData[rx_sender][params[INDEX_APP_ID]].data;
                        for (var i = 0; i < params[4]; i++) {
                            var n_offset = offset + (i * params[5] * 4);
                            for (var j = 0; j < (params[3] * 4) ; j += 4) {
                                // i+3 is alpha (the fourth element)
                                img_data[n_offset + j + 0] = (raw_value >> 16) & 0xff;
                                img_data[n_offset + j + 1] = (raw_value >> 8) & 0xff;
                                img_data[n_offset + j + 2] = (raw_value >> 0) & 0xff;
                                img_data[n_offset + j + 3] = 0xff;        // alpha
                            }
                        }
                        last_proc_seq[rx_sender] = node.seq;
                        is_processing = false;
                        return;
                    }
                    readPngCb(uint8View, params);
                }
                else if (params[0] == 131) {   // GIVE_CONTROL
                    log('got control from ' + rx_sender);
                    var has_anyone_control = false;
                    for(var i=0; i<256; i++) {
                        if (have_control[i] == true) {
                            log(i + ' has already control!');
                            has_anyone_control = true;
                            break;
                        }
                    }
                    if (has_anyone_control == false || rx_sender == activePart) {
                        if (container_id) {
                            for (i = 0; i < container_id.childNodes.length; i++) {
                                if (container_id.childNodes[i].nodeName == 'CANVAS' || container_id.childNodes[i].nodeName == 'canvas') {
                                    var myCanvas = container_id.childNodes[i];
                                    myCanvas.style["cursor"] = "default";
                                    break;
                                }
                            }
                        }
                        var doc = canvas[2].ownerDocument;
                        var win = null;
                        if (doc) {
                            win = doc.defaultView || doc.parentWindow;
                        }
                        else {
                            doc = container_id.ownerDocument;
                            if (doc) {
                                win = doc.defaultView || doc.parentWindow;
                            }
                        }
                        if (mouse_element) {
                            container_id.removeChild(mouse_element);
                            mouse_element = null;
                            mouse_type = -1;
                        }
                        if (canvas[2].addEventListener) {
                            log('control addEventListener');
                            canvas[2].addEventListener("mousedown", mouseDownHandle, false);
                            canvas[2].addEventListener("mousemove", mouseMoveHandle, false);
                            canvas[2].addEventListener("mouseup", mouseUpHandle, false);
                            canvas[2].addEventListener("dblclick", mouseDoubleClickHandle, false);
                            canvas[2].addEventListener("DOMMouseScroll", domMouseScroll, false);
                            canvas[2].addEventListener('mousewheel', mousewheel_l, false);
                            if (win) {
                                win.addEventListener('keypress', keypress_l, false);
                                win.addEventListener('keydown', keydown_l, false);
                                win.addEventListener('keyup', keyup_l, false);
                            }
                        }
                        else if (canvas[2].attachEvent) {
                            log('control attachEvent');
                            canvas[2].attachEvent("onmousedown", mouseDownHandle, false);
                            canvas[2].attachEvent("onmousemove", mouseMoveHandle, false);
                            canvas[2].attachEvent("onmouseup", mouseUpHandle, false);
                            canvas[2].attachEvent("ondblclick", mouseDoubleClickHandle, false);
                            canvas[2].attachEvent('mousewheel', mousewheel_a, false);
                            canvas[2].attachEvent('onmousewheel', mousewheel_a, false);
                            if (win) {
                                win.attachEvent('keypress', keypress_a, false);
                                win.attachEvent('keydown', keydown_a, false);
                                win.attachEvent('keyup', keyup_a, false);
                                win.attachEvent('onkeypress', keypress_a, false);
                                win.attachEvent('onkeydown', keydown_a, false);
                                win.attachEvent('onkeyup', keyup_a, false);
                            }
                        }
                    }
                    have_control[rx_sender] = true;
                }
                else if (params[0] == 132) {   // TAKE_CONTROL
                    log('control removed from ' + rx_sender);
                    have_control[rx_sender] = false;
                    var has_anyone_control = false;
                    for(var i=0; i<256; i++) {
                        if (have_control[i] == true) {
                            log(i + ' still has control!');
                            has_anyone_control = true;
                            break;
                        }
                    }
                    if (has_anyone_control == false) {
                        if (container_id) {
                            for (i = 0; i < container_id.childNodes.length; i++) {
                                if (container_id.childNodes[i].nodeName == 'CANVAS' || container_id.childNodes[i].nodeName == 'canvas') {
                                    var myCanvas = container_id.childNodes[i];
                                    myCanvas.style["cursor"] = "default";
                                    break;
                                }
                            }
                        }
                        var doc = canvas[2].ownerDocument;
                        var win = null;
                        if (doc) {
                            win = doc.defaultView || doc.parentWindow;
                        }
                        else {
                            doc = container_id.ownerDocument;
                            if (doc) {
                                win = doc.defaultView || doc.parentWindow;
                            }
                        }
                        if (canvas[2].removeEventListener) {
                            canvas[2].removeEventListener("mousedown", mouseDownHandle, false);
                            canvas[2].removeEventListener("mousemove", mouseMoveHandle, false);
                            canvas[2].removeEventListener("mouseup", mouseUpHandle, false);
                            canvas[2].removeEventListener("dblclick", mouseDoubleClickHandle, false);
                            canvas[2].removeEventListener("DOMMouseScroll", domMouseScroll, false);
                            canvas[2].removeEventListener('mousewheel', mousewheel_l, false);
                            if (win) {
                                win.removeEventListener('keypress', keypress_l, false);
                                win.removeEventListener('keydown', keydown_l, false);
                                win.removeEventListener('keyup', keyup_l, false);
                            }
                        }
                        else if (canvas[2].removeEvent) {
                            canvas[2].removeEvent("onmousedown", mouseDownHandle, false);
                            canvas[2].removeEvent("onmousemove", mouseMoveHandle, false);
                            canvas[2].removeEvent("onmouseup", mouseUpHandle, false);
                            canvas[2].removeEvent("ondblclick", mouseDoubleClickHandle, false);
                            canvas[2].removeEvent('onmousewheel', mousewheel_a, false);
                            canvas[2].removeEvent('mousewheel', mousewheel_a, false);
                            if (win) {
                                win.removeEvent('keypress', keypress_a, false);
                                win.removeEvent('keydown', keydown_a, false);
                                win.removeEvent('keyup', keyup_a, false);
                                win.removeEvent('onkeypress', keypress_a, false);
                                win.removeEvent('onkeydown', keydown_a, false);
                                win.removeEvent('onkeyup', keyup_a, false);
                            }
                        }
                        if (mouse_element == null) {
                            log('control removed ' + mouse_element);
                            myCanvas = null;
                            mouse_element = document.createElement("div");
                            mouse_element.setAttribute("style", "position:absolute; visibility:hidden; background: url('" + cursors_file + "') no-repeat; background-position: 0px -120px; width:24px; height:24px; ");
                            mouse_type = -1;
                            container_id.appendChild(mouse_element);
                        }
                    }
                }
                else if (params[0] == 135) {   // REQUEST_NAME
                    //log('sendOwnName (' + rx_sender + ') = ' + params[0]);
                    sendOwnName(0xff, rx_sender);
                }
                else {   // MSG
                    //log('readMsgCb');
                    readMsgCb(uint8View, uint8View.length, params);
                }
                last_proc_seq[rx_sender] = node.seq;
            }
            is_processing = false;
            //log('end proc ' + is_processing + ' l = ' + last_proc_seq[rx_sender] + ' q=' + sharingQueue[rx_sender].length);
        }

        this.requestControl = function () {
            requestControl();
        }

        this.fitToElement = function (remScaleImage) {
            fitToElement(remScaleImage);
        }

        this.close = function () {
            close();
        }

        this.init = function (dataChannel) {
            init(dataChannel);
        }

        this.sharing_event = function (type, data) {
            return sharingEvent(type, data);
        }

        this.recv = function (data) {
            recv(data);
        }
    }

    // public API
    return _AppSharing;
})();