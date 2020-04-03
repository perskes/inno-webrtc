/*---------------------------------------------------------------------------*/
/* innovaphone.pbxwebsocket.ToneGenerator.js                                 */
/* Generator for creating ringback tones for telephony                       */
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

var innovaphone = innovaphone || {};
innovaphone.pbxwebsocket = innovaphone.pbxwebsocket || {};
innovaphone.pbxwebsocket.PathPrefix = innovaphone.pbxwebsocket.PathPrefix || "";
innovaphone.pbxwebsocket.ToneGenerator = innovaphone.pbxwebsocket.ToneGenerator || (function () {

    // Constructor
    function _ToneGenerator(logFunction) {
        var audio = null,
            timer = null,
            configuration = {
                tone: 0,
                time: [0, 0, 0, 0, 0, 0, 0, 0]
            },
            step = 0,
            stepToneOn = [true, false, true, false, true, false, true, false],
            toneFiles = ["tonepair00.mp3", "tonepair01.mp3", "tonepair02.mp3", "tonepair01.mp3", "tonepair04.mp3", "tonepair05.mp3", "tonepair06.mp3", "tonepair07.mp3", "tonepair01.mp3", "tonepair09.mp3", "tonepair00.mp3", "tonepair11.mp3", "tonepair12.mp3"],
            ringFiles = ["ringtone00.mp3"],
            currentToneFile = null,
            states = { IDLE: 0, TONE: 1, RING: 2 },
            state = states.IDLE,
            log = logFunction ? function (text) { logFunction("ToneGenerator: " + text); } : function () { };

        // private functions
        var toneOn = function (config) {
            toneOff();
            ringOff();
            if (audio) {
                log("Tone on " + JSON.stringify(config));
                currentToneFile = innovaphone.pbxwebsocket.PathPrefix + (configuration.tone >= 0 && configuration.tone <= 12 ? toneFiles[configuration.tone] : toneFiles[0]);
                state = states.TONE;
                configuration = config;
                step = 0;
                applyStep();
            }
        }

        var toneOff = function () {
            if (state == states.TONE) {
                log("Tone off")
                state = states.IDLE;
                stopTimer();
                step = 0;
                if (audio) {
                    audio.src = "";
                }
            }
        }

        var ringOn = function () {
            toneOff();
            ringOff();
            if (audio) {
                log("Ring on");
                state = states.RING;
                audio.srcObject = null;
                audio.autoplay = true;
                audio.loop = true;
                audio.src = innovaphone.pbxwebsocket.PathPrefix + ringFiles[0];
            }
        }

        var ringOff = function () {
            if (state == states.RING) {
                log("Ring off");
                state = states.IDLE;
                if (audio) {
                    audio.src = "";
                }
            }
        }

        var close = function (error) {
            toneOff();
            ringOff();
            audio = null;
        }

        var applyStep = function () {
            if (stepToneOn[step]) {
                audio.srcObject = null;
                audio.autoplay = true;
                audio.loop = false;
                audio.src = currentToneFile;
            }
            else {
                audio.src = "";
            }
            startTimer(configuration.time[step]);
        }

        var nextStep = function () {
            step++;
            if (step > 7 || configuration.time[step] == 0) step = 0;
            applyStep();
        }

        var stopTimer = function () {
            if (timer) window.clearTimeout(timer);
            timer = 0;
        }

        var startTimer = function (timeout) {
            stopTimer();
            timer = window.setTimeout(function () { nextStep() }, timeout);
        }

        // public functions
        this.toneOn = function (tone, on0, off0, on1, off1, on2, off2, on3, off3) {
            toneOn({ tone: tone, time: [on0, off0, on1, off1, on2, off2, on3, off3] });
        }

        this.toneOff = function () {
            toneOff();
        }

        this.ringOn = function () {
            ringOn();
        }

        this.ringOff = function () {
            ringOff();
        }

        this.close = function () {
            close();
        }

        // initialization
        audio = document.createElement("audio");
    }

    // public API
    return _ToneGenerator;
})();
