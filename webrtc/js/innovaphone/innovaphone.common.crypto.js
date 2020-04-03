/*---------------------------------------------------------------------------*/
/* innovaphone.util.crypto.js                                                */
/* A collection of open source crypto functions                              */
/*---------------------------------------------------------------------------*/

var innovaphone = innovaphone || {};
innovaphone.common = innovaphone.common || {};
innovaphone.common.crypto = innovaphone.common.crypto || (function () {

    function str2hex(input) {
        function d2h(d) { var r = d.toString(16); if (r.length < 2) r = "0" + r; return r; }
        var tmp = input;
        var str = '';
        for (var i = 0; i < tmp.length; i++) {
            c = tmp.charCodeAt(i);
            str += d2h(c);
        }
        return str;
    }

    function hex2str(input) {
        var hex = input.toString();
        var str = '';
        for (var i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return str;
    }

    /**
    *
    *  Secure Hash Algorithm (SHA1)
    *  http://www.webtoolkit.info/
    *
    **/

    function SHA1(msg) {

        function rotateLeft(n, s) {
            var t4 = (n << s) | (n >>> (32 - s));
            return t4;
        };

        function lsbHex(val) {
            var str = "";
            var i;
            var vh;
            var vl;

            for (i = 0; i <= 6; i += 2) {
                vh = (val >>> (i * 4 + 4)) & 0x0f;
                vl = (val >>> (i * 4)) & 0x0f;
                str += vh.toString(16) + vl.toString(16);
            }
            return str;
        };

        function cvtHex(val) {
            var str = "";
            var i;
            var v;

            for (i = 7; i >= 0; i--) {
                v = (val >>> (i * 4)) & 0x0f;
                str += v.toString(16);
            }
            return str;
        };


        function Utf8Encode(string) {
            string = string.replace(/\r\n/g, "\n");
            return unescape(encodeURIComponent(string));
        };

        var blockstart;
        var i, j;
        var W = new Array(80);
        var H0 = 0x67452301;
        var H1 = 0xEFCDAB89;
        var H2 = 0x98BADCFE;
        var H3 = 0x10325476;
        var H4 = 0xC3D2E1F0;
        var A, B, C, D, E;
        var temp;

        msg = Utf8Encode(msg);

        var msgLen = msg.length;

        var wordArray = new Array();
        for (i = 0; i < msgLen - 3; i += 4) {
            j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 |
            msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3);
            wordArray.push(j);
        }

        switch (msgLen % 4) {
            case 0:
                i = 0x080000000;
                break;
            case 1:
                i = msg.charCodeAt(msgLen - 1) << 24 | 0x0800000;
                break;

            case 2:
                i = msg.charCodeAt(msgLen - 2) << 24 | msg.charCodeAt(msgLen - 1) << 16 | 0x08000;
                break;

            case 3:
                i = msg.charCodeAt(msgLen - 3) << 24 | msg.charCodeAt(msgLen - 2) << 16 | msg.charCodeAt(msgLen - 1) << 8 | 0x80;
                break;
        }

        wordArray.push(i);

        while ((wordArray.length % 16) != 14) wordArray.push(0);

        wordArray.push(msgLen >>> 29);
        wordArray.push((msgLen << 3) & 0x0ffffffff);


        for (blockstart = 0; blockstart < wordArray.length; blockstart += 16) {

            for (i = 0; i < 16; i++) W[i] = wordArray[blockstart + i];
            for (i = 16; i <= 79; i++) W[i] = rotateLeft(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

            A = H0;
            B = H1;
            C = H2;
            D = H3;
            E = H4;

            for (i = 0; i <= 19; i++) {
                temp = (rotateLeft(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotateLeft(B, 30);
                B = A;
                A = temp;
            }

            for (i = 20; i <= 39; i++) {
                temp = (rotateLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotateLeft(B, 30);
                B = A;
                A = temp;
            }

            for (i = 40; i <= 59; i++) {
                temp = (rotateLeft(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotateLeft(B, 30);
                B = A;
                A = temp;
            }

            for (i = 60; i <= 79; i++) {
                temp = (rotateLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotateLeft(B, 30);
                B = A;
                A = temp;
            }

            H0 = (H0 + A) & 0x0ffffffff;
            H1 = (H1 + B) & 0x0ffffffff;
            H2 = (H2 + C) & 0x0ffffffff;
            H3 = (H3 + D) & 0x0ffffffff;
            H4 = (H4 + E) & 0x0ffffffff;

        }

        var temp = cvtHex(H0) + cvtHex(H1) + cvtHex(H2) + cvtHex(H3) + cvtHex(H4);

        return temp.toLowerCase();
    }

    /**
    *
    *  Secure Hash Algorithm (SHA256)
    *  http://www.webtoolkit.info/
    *
    *  Original code by Angel Marin, Paul Johnston.
    *
    **/

    function SHA256(s) {

        var chrsz = 8;
        var hexcase = 0;

        function safeAdd(x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF);
            var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        }

        function S(X, n) { return (X >>> n) | (X << (32 - n)); }
        function R(X, n) { return (X >>> n); }
        function Ch(x, y, z) { return ((x & y) ^ ((~x) & z)); }
        function Maj(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)); }
        function Sigma0256(x) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }
        function Sigma1256(x) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }
        function Gamma0256(x) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }
        function Gamma1256(x) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }

        function coreSha256(m, l) {
            var K = new Array(0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2);
            var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
            var W = new Array(64);
            var a, b, c, d, e, f, g, h, i, j;
            var T1, T2;

            m[l >> 5] |= 0x80 << (24 - l % 32);
            m[((l + 64 >> 9) << 4) + 15] = l;

            for (var i = 0; i < m.length; i += 16) {
                a = HASH[0];
                b = HASH[1];
                c = HASH[2];
                d = HASH[3];
                e = HASH[4];
                f = HASH[5];
                g = HASH[6];
                h = HASH[7];

                for (var j = 0; j < 64; j++) {
                    if (j < 16) W[j] = m[j + i];
                    else W[j] = safeAdd(safeAdd(safeAdd(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);

                    T1 = safeAdd(safeAdd(safeAdd(safeAdd(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
                    T2 = safeAdd(Sigma0256(a), Maj(a, b, c));

                    h = g;
                    g = f;
                    f = e;
                    e = safeAdd(d, T1);
                    d = c;
                    c = b;
                    b = a;
                    a = safeAdd(T1, T2);
                }

                HASH[0] = safeAdd(a, HASH[0]);
                HASH[1] = safeAdd(b, HASH[1]);
                HASH[2] = safeAdd(c, HASH[2]);
                HASH[3] = safeAdd(d, HASH[3]);
                HASH[4] = safeAdd(e, HASH[4]);
                HASH[5] = safeAdd(f, HASH[5]);
                HASH[6] = safeAdd(g, HASH[6]);
                HASH[7] = safeAdd(h, HASH[7]);
            }
            return HASH;
        }

        function str2binb(str) {
            var bin = Array();
            var mask = (1 << chrsz) - 1;
            for (var i = 0; i < str.length * chrsz; i += chrsz) {
                bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
            }
            return bin;
        }

        function Utf8Encode(string) {
            string = string.replace(/\r\n/g, "\n");
            return unescape(encodeURIComponent(string));
        };

        function binb2hex(binarray) {
            var hexTab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
            var str = "";
            for (var i = 0; i < binarray.length * 4; i++) {
                str += hexTab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
                hexTab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
            }
            return str;
        }

        s = Utf8Encode(s);
        return binb2hex(coreSha256(str2binb(s), s.length * chrsz));
    }

    /*
     * RC4 symmetric cipher encryption/decryption
     *
     * https://gist.github.com/farhadi/2185197#file-rc4-js
     *
     * @license Public Domain
     * @param string key - secret key for encryption/decryption
     * @param string str - string to be encrypted/decrypted
     * @return string
     */
    function rc4(key, str) {
        var s = [], j = 0, x, res = '';
        for (var i = 0; i < 256; i++) {
            s[i] = i;
        }
        for (i = 0; i < 256; i++) {
            j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
            x = s[i];
            s[i] = s[j];
            s[j] = x;
        }
        i = 0;
        j = 0;
        for (var y = 0; y < str.length; y++) {
            i = (i + 1) % 256;
            j = (j + s[i]) % 256;
            x = s[i];
            s[i] = s[j];
            s[j] = x;
            res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
        }
        return res;
    }

    /* 
     * Paul Tero, July 2001
     * http://www.tero.co.uk/des/
     * 
     * Optimised for performance with large blocks by Michael Hayworth, November 2001
     * http://www.netdealing.com
     * 
     * THIS SOFTWARE IS PROVIDED "AS IS" AND
     * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
     * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
     * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
     * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
     * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
     * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
     * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
     * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
     * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
     * SUCH DAMAGE.
     *
     * Code reformatted by innovaphone
     */

    function des(key, message, encrypt, mode, iv, padding) {
        var spfunction1 = new Array(0x1010400, 0, 0x10000, 0x1010404, 0x1010004, 0x10404, 0x4, 0x10000, 0x400, 0x1010400, 0x1010404, 0x400, 0x1000404, 0x1010004, 0x1000000, 0x4, 0x404, 0x1000400, 0x1000400, 0x10400, 0x10400, 0x1010000, 0x1010000, 0x1000404, 0x10004, 0x1000004, 0x1000004, 0x10004, 0, 0x404, 0x10404, 0x1000000, 0x10000, 0x1010404, 0x4, 0x1010000, 0x1010400, 0x1000000, 0x1000000, 0x400, 0x1010004, 0x10000, 0x10400, 0x1000004, 0x400, 0x4, 0x1000404, 0x10404, 0x1010404, 0x10004, 0x1010000, 0x1000404, 0x1000004, 0x404, 0x10404, 0x1010400, 0x404, 0x1000400, 0x1000400, 0, 0x10004, 0x10400, 0, 0x1010004);
        var spfunction2 = new Array(-0x7fef7fe0, -0x7fff8000, 0x8000, 0x108020, 0x100000, 0x20, -0x7fefffe0, -0x7fff7fe0, -0x7fffffe0, -0x7fef7fe0, -0x7fef8000, -0x80000000, -0x7fff8000, 0x100000, 0x20, -0x7fefffe0, 0x108000, 0x100020, -0x7fff7fe0, 0, -0x80000000, 0x8000, 0x108020, -0x7ff00000, 0x100020, -0x7fffffe0, 0, 0x108000, 0x8020, -0x7fef8000, -0x7ff00000, 0x8020, 0, 0x108020, -0x7fefffe0, 0x100000, -0x7fff7fe0, -0x7ff00000, -0x7fef8000, 0x8000, -0x7ff00000, -0x7fff8000, 0x20, -0x7fef7fe0, 0x108020, 0x20, 0x8000, -0x80000000, 0x8020, -0x7fef8000, 0x100000, -0x7fffffe0, 0x100020, -0x7fff7fe0, -0x7fffffe0, 0x100020, 0x108000, 0, -0x7fff8000, 0x8020, -0x80000000, -0x7fefffe0, -0x7fef7fe0, 0x108000);
        var spfunction3 = new Array(0x208, 0x8020200, 0, 0x8020008, 0x8000200, 0, 0x20208, 0x8000200, 0x20008, 0x8000008, 0x8000008, 0x20000, 0x8020208, 0x20008, 0x8020000, 0x208, 0x8000000, 0x8, 0x8020200, 0x200, 0x20200, 0x8020000, 0x8020008, 0x20208, 0x8000208, 0x20200, 0x20000, 0x8000208, 0x8, 0x8020208, 0x200, 0x8000000, 0x8020200, 0x8000000, 0x20008, 0x208, 0x20000, 0x8020200, 0x8000200, 0, 0x200, 0x20008, 0x8020208, 0x8000200, 0x8000008, 0x200, 0, 0x8020008, 0x8000208, 0x20000, 0x8000000, 0x8020208, 0x8, 0x20208, 0x20200, 0x8000008, 0x8020000, 0x8000208, 0x208, 0x8020000, 0x20208, 0x8, 0x8020008, 0x20200);
        var spfunction4 = new Array(0x802001, 0x2081, 0x2081, 0x80, 0x802080, 0x800081, 0x800001, 0x2001, 0, 0x802000, 0x802000, 0x802081, 0x81, 0, 0x800080, 0x800001, 0x1, 0x2000, 0x800000, 0x802001, 0x80, 0x800000, 0x2001, 0x2080, 0x800081, 0x1, 0x2080, 0x800080, 0x2000, 0x802080, 0x802081, 0x81, 0x800080, 0x800001, 0x802000, 0x802081, 0x81, 0, 0, 0x802000, 0x2080, 0x800080, 0x800081, 0x1, 0x802001, 0x2081, 0x2081, 0x80, 0x802081, 0x81, 0x1, 0x2000, 0x800001, 0x2001, 0x802080, 0x800081, 0x2001, 0x2080, 0x800000, 0x802001, 0x80, 0x800000, 0x2000, 0x802080);
        var spfunction5 = new Array(0x100, 0x2080100, 0x2080000, 0x42000100, 0x80000, 0x100, 0x40000000, 0x2080000, 0x40080100, 0x80000, 0x2000100, 0x40080100, 0x42000100, 0x42080000, 0x80100, 0x40000000, 0x2000000, 0x40080000, 0x40080000, 0, 0x40000100, 0x42080100, 0x42080100, 0x2000100, 0x42080000, 0x40000100, 0, 0x42000000, 0x2080100, 0x2000000, 0x42000000, 0x80100, 0x80000, 0x42000100, 0x100, 0x2000000, 0x40000000, 0x2080000, 0x42000100, 0x40080100, 0x2000100, 0x40000000, 0x42080000, 0x2080100, 0x40080100, 0x100, 0x2000000, 0x42080000, 0x42080100, 0x80100, 0x42000000, 0x42080100, 0x2080000, 0, 0x40080000, 0x42000000, 0x80100, 0x2000100, 0x40000100, 0x80000, 0, 0x40080000, 0x2080100, 0x40000100);
        var spfunction6 = new Array(0x20000010, 0x20400000, 0x4000, 0x20404010, 0x20400000, 0x10, 0x20404010, 0x400000, 0x20004000, 0x404010, 0x400000, 0x20000010, 0x400010, 0x20004000, 0x20000000, 0x4010, 0, 0x400010, 0x20004010, 0x4000, 0x404000, 0x20004010, 0x10, 0x20400010, 0x20400010, 0, 0x404010, 0x20404000, 0x4010, 0x404000, 0x20404000, 0x20000000, 0x20004000, 0x10, 0x20400010, 0x404000, 0x20404010, 0x400000, 0x4010, 0x20000010, 0x400000, 0x20004000, 0x20000000, 0x4010, 0x20000010, 0x20404010, 0x404000, 0x20400000, 0x404010, 0x20404000, 0, 0x20400010, 0x10, 0x4000, 0x20400000, 0x404010, 0x4000, 0x400010, 0x20004010, 0, 0x20404000, 0x20000000, 0x400010, 0x20004010);
        var spfunction7 = new Array(0x200000, 0x4200002, 0x4000802, 0, 0x800, 0x4000802, 0x200802, 0x4200800, 0x4200802, 0x200000, 0, 0x4000002, 0x2, 0x4000000, 0x4200002, 0x802, 0x4000800, 0x200802, 0x200002, 0x4000800, 0x4000002, 0x4200000, 0x4200800, 0x200002, 0x4200000, 0x800, 0x802, 0x4200802, 0x200800, 0x2, 0x4000000, 0x200800, 0x4000000, 0x200800, 0x200000, 0x4000802, 0x4000802, 0x4200002, 0x4200002, 0x2, 0x200002, 0x4000000, 0x4000800, 0x200000, 0x4200800, 0x802, 0x200802, 0x4200800, 0x802, 0x4000002, 0x4200802, 0x4200000, 0x200800, 0, 0x2, 0x4200802, 0, 0x200802, 0x4200000, 0x800, 0x4000002, 0x4000800, 0x800, 0x200002);
        var spfunction8 = new Array(0x10001040, 0x1000, 0x40000, 0x10041040, 0x10000000, 0x10001040, 0x40, 0x10000000, 0x40040, 0x10040000, 0x10041040, 0x41000, 0x10041000, 0x41040, 0x1000, 0x40, 0x10040000, 0x10000040, 0x10001000, 0x1040, 0x41000, 0x40040, 0x10040040, 0x10041000, 0x1040, 0, 0, 0x10040040, 0x10000040, 0x10001000, 0x41040, 0x40000, 0x41040, 0x40000, 0x10041000, 0x1000, 0x40, 0x10040040, 0x1000, 0x41040, 0x10001000, 0x40, 0x10000040, 0x10040000, 0x10040040, 0x10000000, 0x40000, 0x10001040, 0, 0x10041040, 0x40040, 0x10000040, 0x10040000, 0x10001000, 0x10001040, 0, 0x10041040, 0x41000, 0x41000, 0x1040, 0x1040, 0x40040, 0x10000000, 0x10041000);
        var keys = desCreateKeys(key);
        var m = 0, i, j, temp, temp2, right1, right2, left, right, looping;
        var cbcleft, cbcleft2, cbcright, cbcright2
        var endloop, loopinc;
        var len = message.length;
        var chunk = 0;
        var iterations = keys.length == 32 ? 3 : 9;
        if (iterations == 3) { looping = encrypt ? new Array(0, 32, 2) : new Array(30, -2, -2); }
        else { looping = encrypt ? new Array(0, 32, 2, 62, 30, -2, 64, 96, 2) : new Array(94, 62, -2, 32, 64, 2, 30, -2, -2); }
        if (padding == 2) message += "        ";
        else if (padding == 1) { temp = 8 - (len % 8); message += String.fromCharCode(temp, temp, temp, temp, temp, temp, temp, temp); if (temp == 8) len += 8; }
        else if (!padding) message += "\0\0\0\0\0\0\0\0";
        result = "";
        tempresult = "";
        if (mode == 1) {
            cbcleft = (iv.charCodeAt(m++) << 24) | (iv.charCodeAt(m++) << 16) | (iv.charCodeAt(m++) << 8) | iv.charCodeAt(m++);
            cbcright = (iv.charCodeAt(m++) << 24) | (iv.charCodeAt(m++) << 16) | (iv.charCodeAt(m++) << 8) | iv.charCodeAt(m++);
            m = 0;
        }
        while (m < len) {
            left = (message.charCodeAt(m++) << 24) | (message.charCodeAt(m++) << 16) | (message.charCodeAt(m++) << 8) | message.charCodeAt(m++);
            right = (message.charCodeAt(m++) << 24) | (message.charCodeAt(m++) << 16) | (message.charCodeAt(m++) << 8) | message.charCodeAt(m++);
            if (mode == 1) { if (encrypt) { left ^= cbcleft; right ^= cbcright; } else { cbcleft2 = cbcleft; cbcright2 = cbcright; cbcleft = left; cbcright = right; } }
            temp = ((left >>> 4) ^ right) & 0x0f0f0f0f; right ^= temp; left ^= (temp << 4);
            temp = ((left >>> 16) ^ right) & 0x0000ffff; right ^= temp; left ^= (temp << 16);
            temp = ((right >>> 2) ^ left) & 0x33333333; left ^= temp; right ^= (temp << 2);
            temp = ((right >>> 8) ^ left) & 0x00ff00ff; left ^= temp; right ^= (temp << 8);
            temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);
            left = ((left << 1) | (left >>> 31));
            right = ((right << 1) | (right >>> 31));
            for (j = 0; j < iterations; j += 3) {
                endloop = looping[j + 1];
                loopinc = looping[j + 2];
                for (i = looping[j]; i != endloop; i += loopinc) {
                    right1 = right ^ keys[i];
                    right2 = ((right >>> 4) | (right << 28)) ^ keys[i + 1];
                    temp = left;
                    left = right;
                    right = temp ^ (spfunction2[(right1 >>> 24) & 0x3f] | spfunction4[(right1 >>> 16) & 0x3f]
                          | spfunction6[(right1 >>> 8) & 0x3f] | spfunction8[right1 & 0x3f]
                          | spfunction1[(right2 >>> 24) & 0x3f] | spfunction3[(right2 >>> 16) & 0x3f]
                          | spfunction5[(right2 >>> 8) & 0x3f] | spfunction7[right2 & 0x3f]);
                }
                temp = left; left = right; right = temp;
            }
            left = ((left >>> 1) | (left << 31));
            right = ((right >>> 1) | (right << 31));
            temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);
            temp = ((right >>> 8) ^ left) & 0x00ff00ff; left ^= temp; right ^= (temp << 8);
            temp = ((right >>> 2) ^ left) & 0x33333333; left ^= temp; right ^= (temp << 2);
            temp = ((left >>> 16) ^ right) & 0x0000ffff; right ^= temp; left ^= (temp << 16);
            temp = ((left >>> 4) ^ right) & 0x0f0f0f0f; right ^= temp; left ^= (temp << 4);
            if (mode == 1) { if (encrypt) { cbcleft = left; cbcright = right; } else { left ^= cbcleft2; right ^= cbcright2; } }
            tempresult += String.fromCharCode((left >>> 24), ((left >>> 16) & 0xff), ((left >>> 8) & 0xff), (left & 0xff), (right >>> 24), ((right >>> 16) & 0xff), ((right >>> 8) & 0xff), (right & 0xff));
            chunk += 8;
            if (chunk == 512) { result += tempresult; tempresult = ""; chunk = 0; }
        }
        result += tempresult;
        result = result.replace(/\0*$/g, "");
        return result;
    }

    function desCreateKeys(key) {
        pc2bytes0 = new Array(0, 0x4, 0x20000000, 0x20000004, 0x10000, 0x10004, 0x20010000, 0x20010004, 0x200, 0x204, 0x20000200, 0x20000204, 0x10200, 0x10204, 0x20010200, 0x20010204);
        pc2bytes1 = new Array(0, 0x1, 0x100000, 0x100001, 0x4000000, 0x4000001, 0x4100000, 0x4100001, 0x100, 0x101, 0x100100, 0x100101, 0x4000100, 0x4000101, 0x4100100, 0x4100101);
        pc2bytes2 = new Array(0, 0x8, 0x800, 0x808, 0x1000000, 0x1000008, 0x1000800, 0x1000808, 0, 0x8, 0x800, 0x808, 0x1000000, 0x1000008, 0x1000800, 0x1000808);
        pc2bytes3 = new Array(0, 0x200000, 0x8000000, 0x8200000, 0x2000, 0x202000, 0x8002000, 0x8202000, 0x20000, 0x220000, 0x8020000, 0x8220000, 0x22000, 0x222000, 0x8022000, 0x8222000);
        pc2bytes4 = new Array(0, 0x40000, 0x10, 0x40010, 0, 0x40000, 0x10, 0x40010, 0x1000, 0x41000, 0x1010, 0x41010, 0x1000, 0x41000, 0x1010, 0x41010);
        pc2bytes5 = new Array(0, 0x400, 0x20, 0x420, 0, 0x400, 0x20, 0x420, 0x2000000, 0x2000400, 0x2000020, 0x2000420, 0x2000000, 0x2000400, 0x2000020, 0x2000420);
        pc2bytes6 = new Array(0, 0x10000000, 0x80000, 0x10080000, 0x2, 0x10000002, 0x80002, 0x10080002, 0, 0x10000000, 0x80000, 0x10080000, 0x2, 0x10000002, 0x80002, 0x10080002);
        pc2bytes7 = new Array(0, 0x10000, 0x800, 0x10800, 0x20000000, 0x20010000, 0x20000800, 0x20010800, 0x20000, 0x30000, 0x20800, 0x30800, 0x20020000, 0x20030000, 0x20020800, 0x20030800);
        pc2bytes8 = new Array(0, 0x40000, 0, 0x40000, 0x2, 0x40002, 0x2, 0x40002, 0x2000000, 0x2040000, 0x2000000, 0x2040000, 0x2000002, 0x2040002, 0x2000002, 0x2040002);
        pc2bytes9 = new Array(0, 0x10000000, 0x8, 0x10000008, 0, 0x10000000, 0x8, 0x10000008, 0x400, 0x10000400, 0x408, 0x10000408, 0x400, 0x10000400, 0x408, 0x10000408);
        pc2bytes10 = new Array(0, 0x20, 0, 0x20, 0x100000, 0x100020, 0x100000, 0x100020, 0x2000, 0x2020, 0x2000, 0x2020, 0x102000, 0x102020, 0x102000, 0x102020);
        pc2bytes11 = new Array(0, 0x1000000, 0x200, 0x1000200, 0x200000, 0x1200000, 0x200200, 0x1200200, 0x4000000, 0x5000000, 0x4000200, 0x5000200, 0x4200000, 0x5200000, 0x4200200, 0x5200200);
        pc2bytes12 = new Array(0, 0x1000, 0x8000000, 0x8001000, 0x80000, 0x81000, 0x8080000, 0x8081000, 0x10, 0x1010, 0x8000010, 0x8001010, 0x80010, 0x81010, 0x8080010, 0x8081010);
        pc2bytes13 = new Array(0, 0x4, 0x100, 0x104, 0, 0x4, 0x100, 0x104, 0x1, 0x5, 0x101, 0x105, 0x1, 0x5, 0x101, 0x105);
        var iterations = key.length > 8 ? 3 : 1;
        var keys = new Array(32 * iterations);
        var shifts = new Array(0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0);
        var lefttemp, righttemp, m = 0, n = 0, temp;
        for (var j = 0; j < iterations; j++) {
            left = (key.charCodeAt(m++) << 24) | (key.charCodeAt(m++) << 16) | (key.charCodeAt(m++) << 8) | key.charCodeAt(m++);
            right = (key.charCodeAt(m++) << 24) | (key.charCodeAt(m++) << 16) | (key.charCodeAt(m++) << 8) | key.charCodeAt(m++);
            temp = ((left >>> 4) ^ right) & 0x0f0f0f0f; right ^= temp; left ^= (temp << 4);
            temp = ((right >>> -16) ^ left) & 0x0000ffff; left ^= temp; right ^= (temp << -16);
            temp = ((left >>> 2) ^ right) & 0x33333333; right ^= temp; left ^= (temp << 2);
            temp = ((right >>> -16) ^ left) & 0x0000ffff; left ^= temp; right ^= (temp << -16);
            temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);
            temp = ((right >>> 8) ^ left) & 0x00ff00ff; left ^= temp; right ^= (temp << 8);
            temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);
            temp = (left << 8) | ((right >>> 20) & 0x000000f0);
            left = (right << 24) | ((right << 8) & 0xff0000) | ((right >>> 8) & 0xff00) | ((right >>> 24) & 0xf0);
            right = temp;
            for (i = 0; i < shifts.length; i++) {
                if (shifts[i]) { left = (left << 2) | (left >>> 26); right = (right << 2) | (right >>> 26); }
                else { left = (left << 1) | (left >>> 27); right = (right << 1) | (right >>> 27); }
                left &= -0xf; right &= -0xf;
                lefttemp = pc2bytes0[left >>> 28] | pc2bytes1[(left >>> 24) & 0xf]
                        | pc2bytes2[(left >>> 20) & 0xf] | pc2bytes3[(left >>> 16) & 0xf]
                        | pc2bytes4[(left >>> 12) & 0xf] | pc2bytes5[(left >>> 8) & 0xf]
                        | pc2bytes6[(left >>> 4) & 0xf];
                righttemp = pc2bytes7[right >>> 28] | pc2bytes8[(right >>> 24) & 0xf]
                          | pc2bytes9[(right >>> 20) & 0xf] | pc2bytes10[(right >>> 16) & 0xf]
                          | pc2bytes11[(right >>> 12) & 0xf] | pc2bytes12[(right >>> 8) & 0xf]
                          | pc2bytes13[(right >>> 4) & 0xf];
                temp = ((righttemp >>> 16) ^ lefttemp) & 0x0000ffff;
                keys[n++] = lefttemp ^ temp; keys[n++] = righttemp ^ (temp << 16);
            }
        }
        return keys;
    }

    /*
    * A JavaScript implementation of the RSA Data Security, Inc. MD4 Message
    * Digest Algorithm, as defined in RFC 1320.
    * Version 2.1 Copyright (C) Jerrad Pierce, Paul Johnston 1999 - 2002.
    * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
    * Distributed under the BSD License
    * See http://pajhome.org.uk/crypt/md5 for more info.
    *
    * Modified by innovaphone
    */

    var chrsz = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */
    function hexMd4(s) { return binl2hex(coreMd4(str2binl(s), s.length * chrsz)); }
    function strMd4(s) { return binl2str(coreMd4(str2binl(s), s.length * chrsz)); }
    function strMd4Ucs2(s) { return binl2str(coreMd4(str2binl2(s, 16), s.length * 16)); }
    function coreMd4(x, len) {
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;
        var a = 1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d = 271733878;
        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;
            a = md4Ff(a, b, c, d, x[i + 0], 3);
            d = md4Ff(d, a, b, c, x[i + 1], 7);
            c = md4Ff(c, d, a, b, x[i + 2], 11);
            b = md4Ff(b, c, d, a, x[i + 3], 19);
            a = md4Ff(a, b, c, d, x[i + 4], 3);
            d = md4Ff(d, a, b, c, x[i + 5], 7);
            c = md4Ff(c, d, a, b, x[i + 6], 11);
            b = md4Ff(b, c, d, a, x[i + 7], 19);
            a = md4Ff(a, b, c, d, x[i + 8], 3);
            d = md4Ff(d, a, b, c, x[i + 9], 7);
            c = md4Ff(c, d, a, b, x[i + 10], 11);
            b = md4Ff(b, c, d, a, x[i + 11], 19);
            a = md4Ff(a, b, c, d, x[i + 12], 3);
            d = md4Ff(d, a, b, c, x[i + 13], 7);
            c = md4Ff(c, d, a, b, x[i + 14], 11);
            b = md4Ff(b, c, d, a, x[i + 15], 19);
            a = md4Gg(a, b, c, d, x[i + 0], 3);
            d = md4Gg(d, a, b, c, x[i + 4], 5);
            c = md4Gg(c, d, a, b, x[i + 8], 9);
            b = md4Gg(b, c, d, a, x[i + 12], 13);
            a = md4Gg(a, b, c, d, x[i + 1], 3);
            d = md4Gg(d, a, b, c, x[i + 5], 5);
            c = md4Gg(c, d, a, b, x[i + 9], 9);
            b = md4Gg(b, c, d, a, x[i + 13], 13);
            a = md4Gg(a, b, c, d, x[i + 2], 3);
            d = md4Gg(d, a, b, c, x[i + 6], 5);
            c = md4Gg(c, d, a, b, x[i + 10], 9);
            b = md4Gg(b, c, d, a, x[i + 14], 13);
            a = md4Gg(a, b, c, d, x[i + 3], 3);
            d = md4Gg(d, a, b, c, x[i + 7], 5);
            c = md4Gg(c, d, a, b, x[i + 11], 9);
            b = md4Gg(b, c, d, a, x[i + 15], 13);
            a = md4Hh(a, b, c, d, x[i + 0], 3);
            d = md4Hh(d, a, b, c, x[i + 8], 9);
            c = md4Hh(c, d, a, b, x[i + 4], 11);
            b = md4Hh(b, c, d, a, x[i + 12], 15);
            a = md4Hh(a, b, c, d, x[i + 2], 3);
            d = md4Hh(d, a, b, c, x[i + 10], 9);
            c = md4Hh(c, d, a, b, x[i + 6], 11);
            b = md4Hh(b, c, d, a, x[i + 14], 15);
            a = md4Hh(a, b, c, d, x[i + 1], 3);
            d = md4Hh(d, a, b, c, x[i + 9], 9);
            c = md4Hh(c, d, a, b, x[i + 5], 11);
            b = md4Hh(b, c, d, a, x[i + 13], 15);
            a = md4Hh(a, b, c, d, x[i + 3], 3);
            d = md4Hh(d, a, b, c, x[i + 11], 9);
            c = md4Hh(c, d, a, b, x[i + 7], 11);
            b = md4Hh(b, c, d, a, x[i + 15], 15);
            a = safeAdd(a, olda);
            b = safeAdd(b, oldb);
            c = safeAdd(c, oldc);
            d = safeAdd(d, oldd);
        }
        return Array(a, b, c, d);
    }
    function md4Cmn(q, a, b, x, s, t) { return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
    function md4Ff(a, b, c, d, x, s) { return md4Cmn((b & c) | ((~b) & d), a, 0, x, s, 0); }
    function md4Gg(a, b, c, d, x, s) { return md4Cmn((b & c) | (b & d) | (c & d), a, 0, x, s, 1518500249); }
    function md4Hh(a, b, c, d, x, s) { return md4Cmn(b ^ c ^ d, a, 0, x, s, 1859775393); }
    function rol(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
    function safeAdd(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }
    function str2binl(str) {
        var bin = Array();
        var mask = (1 << chrsz) - 1;
        for (var i = 0; i < str.length * chrsz; i += chrsz)
            bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (i % 32);
        return bin;
    }
    function str2binl2(str,clen) {
        var bin = Array();
        var mask = (1 << clen) - 1;
        for (var i = 0; i < str.length * clen; i += clen)
            bin[i >> 5] |= (str.charCodeAt(i / clen) & mask) << (i % 32);
        return bin;
    }
    function binl2str(bin) {
        var str = "";
        var mask = (1 << chrsz) - 1;
        for (var i = 0; i < bin.length * 32; i += chrsz)
            str += String.fromCharCode((bin[i >> 5] >>> (i % 32)) & mask);
        return str;
    }
    function binl2hex(binarray) {
        var hexTab = "0123456789abcdef";
        var str = "";
        for (var i = 0; i < binarray.length * 4; i++) {
            str += hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xF) +
                   hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xF);
        }
        return str;
    }


    /*
    * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
    * Digest Algorithm, as defined in RFC 1321.
    * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
    * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
    * Distributed under the BSD License
    * See http://pajhome.org.uk/crypt/md5 for more info.
    */

    /*
     * Configurable variables. You may need to tweak these to be compatible with
     * the server-side, but the defaults work in most cases.
     */
    var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
    var b64pad = "";  /* base-64 pad character. "=" for strict RFC compliance   */

    /*
     * These are the functions you'll usually want to call
     * They take string arguments and return either hex or base-64 encoded strings
     */
    function hexMd5(s) { return rstr2hex(rstrMd5(str2rstrUtf8(s))); }
    function b64Md5(s) { return rstr2b64(rstrMd5(str2rstrUtf8(s))); }
    function anyMd5(s, e) { return rstr2any(rstrMd5(str2rstrUtf8(s)), e); }
    function hexHmacMd5(k, d)
    { return rstr2hex(rstrHmacMd5(str2rstrUtf8(k), str2rstrUtf8(d))); }
    function b64HmacMd5(k, d)
    { return rstr2b64(rstrHmacMd5(str2rstrUtf8(k), str2rstrUtf8(d))); }
    function anyHmacMd5(k, d, e)
    { return rstr2any(rstrHmacMd5(str2rstrUtf8(k), str2rstrUtf8(d)), e); }

    /*
     * Perform a simple self-test to see if the VM is working
     */
    function md5VmTest() {
        return hexMd5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
    }

    /*
     * Calculate the MD5 of a raw string
     */
    function rstrMd5(s) {
        return binl2rstr(binlMd5(rstr2binl(s), s.length * 8));
    }

    /*
     * Calculate the HMAC-MD5, of a key and some data (raw strings)
     */
    function rstrHmacMd5(key, data) {
        var bkey = rstr2binl(key);
        if (bkey.length > 16) bkey = binlMd5(bkey, key.length * 8);

        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        var hash = binlMd5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
        return binl2rstr(binlMd5(opad.concat(hash), 512 + 128));
    }

    /*
     * Convert a raw string to a hex string
     */
    function rstr2hex(input) {
        try { hexcase } catch (e) { hexcase = 0; }
        var hexTab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var output = "";
        var x;
        for (var i = 0; i < input.length; i++) {
            x = input.charCodeAt(i);
            output += hexTab.charAt((x >>> 4) & 0x0F)
                   + hexTab.charAt(x & 0x0F);
        }
        return output;
    }

    /*
     * Convert a raw string to a base-64 string
     */
    function rstr2b64(input) {
        try { b64pad } catch (e) { b64pad = ''; }
        var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var output = "";
        var len = input.length;
        for (var i = 0; i < len; i += 3) {
            var triplet = (input.charCodeAt(i) << 16)
                        | (i + 1 < len ? input.charCodeAt(i + 1) << 8 : 0)
                        | (i + 2 < len ? input.charCodeAt(i + 2) : 0);
            for (var j = 0; j < 4; j++) {
                if (i * 8 + j * 6 > input.length * 8) output += b64pad;
                else output += tab.charAt((triplet >>> 6 * (3 - j)) & 0x3F);
            }
        }
        return output;
    }

    /*
     * Convert a raw string to an arbitrary string encoding
     */
    function rstr2any(input, encoding) {
        var divisor = encoding.length;
        var i, j, q, x, quotient;

        /* Convert to an array of 16-bit big-endian values, forming the dividend */
        var dividend = Array(Math.ceil(input.length / 2));
        for (i = 0; i < dividend.length; i++) {
            dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
        }

        /*
         * Repeatedly perform a long division. The binary array forms the dividend,
         * the length of the encoding is the divisor. Once computed, the quotient
         * forms the dividend for the next step. All remainders are stored for later
         * use.
         */
        var fullLength = Math.ceil(input.length * 8 /
                                          (Math.log(encoding.length) / Math.log(2)));
        var remainders = Array(fullLength);
        for (j = 0; j < fullLength; j++) {
            quotient = Array();
            x = 0;
            for (i = 0; i < dividend.length; i++) {
                x = (x << 16) + dividend[i];
                q = Math.floor(x / divisor);
                x -= q * divisor;
                if (quotient.length > 0 || q > 0)
                    quotient[quotient.length] = q;
            }
            remainders[j] = x;
            dividend = quotient;
        }

        /* Convert the remainders to the output string */
        var output = "";
        for (i = remainders.length - 1; i >= 0; i--)
            output += encoding.charAt(remainders[i]);

        return output;
    }

    /*
     * Encode a string as utf-8.
     * For efficiency, this assumes the input is valid utf-16.
     */
    function str2rstrUtf8(input) {
        var output = "";
        var i = -1;
        var x, y;

        while (++i < input.length) {
            /* Decode utf-16 surrogate pairs */
            x = input.charCodeAt(i);
            y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
            if (0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
                x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
                i++;
            }

            /* Encode output as utf-8 */
            if (x <= 0x7F)
                output += String.fromCharCode(x);
            else if (x <= 0x7FF)
                output += String.fromCharCode(0xC0 | ((x >>> 6) & 0x1F),
                                              0x80 | (x & 0x3F));
            else if (x <= 0xFFFF)
                output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                              0x80 | ((x >>> 6) & 0x3F),
                                              0x80 | (x & 0x3F));
            else if (x <= 0x1FFFFF)
                output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                              0x80 | ((x >>> 12) & 0x3F),
                                              0x80 | ((x >>> 6) & 0x3F),
                                              0x80 | (x & 0x3F));
        }
        return output;
    }

    /*
     * Convert a raw string to an array of little-endian words
     * Characters >255 have their high-byte silently ignored.
     */
    function rstr2binl(input) {
        var output = Array(input.length >> 2);
        for (var i = 0; i < output.length; i++)
            output[i] = 0;
        for (var i = 0; i < input.length * 8; i += 8)
            output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
        return output;
    }

    /*
     * Convert an array of little-endian words to a string
     */
    function binl2rstr(input) {
        var output = "";
        for (var i = 0; i < input.length * 32; i += 8)
            output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
        return output;
    }

    /*
     * Calculate the MD5 of an array of little-endian words, and a bit length.
     */
    function binlMd5(x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var a = 1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d = 271733878;

        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;

            a = md5Ff(a, b, c, d, x[i + 0], 7, -680876936);
            d = md5Ff(d, a, b, c, x[i + 1], 12, -389564586);
            c = md5Ff(c, d, a, b, x[i + 2], 17, 606105819);
            b = md5Ff(b, c, d, a, x[i + 3], 22, -1044525330);
            a = md5Ff(a, b, c, d, x[i + 4], 7, -176418897);
            d = md5Ff(d, a, b, c, x[i + 5], 12, 1200080426);
            c = md5Ff(c, d, a, b, x[i + 6], 17, -1473231341);
            b = md5Ff(b, c, d, a, x[i + 7], 22, -45705983);
            a = md5Ff(a, b, c, d, x[i + 8], 7, 1770035416);
            d = md5Ff(d, a, b, c, x[i + 9], 12, -1958414417);
            c = md5Ff(c, d, a, b, x[i + 10], 17, -42063);
            b = md5Ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = md5Ff(a, b, c, d, x[i + 12], 7, 1804603682);
            d = md5Ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = md5Ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = md5Ff(b, c, d, a, x[i + 15], 22, 1236535329);

            a = md5Gg(a, b, c, d, x[i + 1], 5, -165796510);
            d = md5Gg(d, a, b, c, x[i + 6], 9, -1069501632);
            c = md5Gg(c, d, a, b, x[i + 11], 14, 643717713);
            b = md5Gg(b, c, d, a, x[i + 0], 20, -373897302);
            a = md5Gg(a, b, c, d, x[i + 5], 5, -701558691);
            d = md5Gg(d, a, b, c, x[i + 10], 9, 38016083);
            c = md5Gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = md5Gg(b, c, d, a, x[i + 4], 20, -405537848);
            a = md5Gg(a, b, c, d, x[i + 9], 5, 568446438);
            d = md5Gg(d, a, b, c, x[i + 14], 9, -1019803690);
            c = md5Gg(c, d, a, b, x[i + 3], 14, -187363961);
            b = md5Gg(b, c, d, a, x[i + 8], 20, 1163531501);
            a = md5Gg(a, b, c, d, x[i + 13], 5, -1444681467);
            d = md5Gg(d, a, b, c, x[i + 2], 9, -51403784);
            c = md5Gg(c, d, a, b, x[i + 7], 14, 1735328473);
            b = md5Gg(b, c, d, a, x[i + 12], 20, -1926607734);

            a = md5Hh(a, b, c, d, x[i + 5], 4, -378558);
            d = md5Hh(d, a, b, c, x[i + 8], 11, -2022574463);
            c = md5Hh(c, d, a, b, x[i + 11], 16, 1839030562);
            b = md5Hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = md5Hh(a, b, c, d, x[i + 1], 4, -1530992060);
            d = md5Hh(d, a, b, c, x[i + 4], 11, 1272893353);
            c = md5Hh(c, d, a, b, x[i + 7], 16, -155497632);
            b = md5Hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = md5Hh(a, b, c, d, x[i + 13], 4, 681279174);
            d = md5Hh(d, a, b, c, x[i + 0], 11, -358537222);
            c = md5Hh(c, d, a, b, x[i + 3], 16, -722521979);
            b = md5Hh(b, c, d, a, x[i + 6], 23, 76029189);
            a = md5Hh(a, b, c, d, x[i + 9], 4, -640364487);
            d = md5Hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = md5Hh(c, d, a, b, x[i + 15], 16, 530742520);
            b = md5Hh(b, c, d, a, x[i + 2], 23, -995338651);

            a = md5Ii(a, b, c, d, x[i + 0], 6, -198630844);
            d = md5Ii(d, a, b, c, x[i + 7], 10, 1126891415);
            c = md5Ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = md5Ii(b, c, d, a, x[i + 5], 21, -57434055);
            a = md5Ii(a, b, c, d, x[i + 12], 6, 1700485571);
            d = md5Ii(d, a, b, c, x[i + 3], 10, -1894986606);
            c = md5Ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = md5Ii(b, c, d, a, x[i + 1], 21, -2054922799);
            a = md5Ii(a, b, c, d, x[i + 8], 6, 1873313359);
            d = md5Ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = md5Ii(c, d, a, b, x[i + 6], 15, -1560198380);
            b = md5Ii(b, c, d, a, x[i + 13], 21, 1309151649);
            a = md5Ii(a, b, c, d, x[i + 4], 6, -145523070);
            d = md5Ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = md5Ii(c, d, a, b, x[i + 2], 15, 718787259);
            b = md5Ii(b, c, d, a, x[i + 9], 21, -343485551);

            a = safeAdd(a, olda);
            b = safeAdd(b, oldb);
            c = safeAdd(c, oldc);
            d = safeAdd(d, oldd);
        }
        return Array(a, b, c, d);
    }

    /*
     * These functions implement the four basic operations the algorithm uses.
     */
    function md5Cmn(q, a, b, x, s, t) {
        return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
    }
    function md5Ff(a, b, c, d, x, s, t) {
        return md5Cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }
    function md5Gg(a, b, c, d, x, s, t) {
        return md5Cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }
    function md5Hh(a, b, c, d, x, s, t) {
        return md5Cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5Ii(a, b, c, d, x, s, t) {
        return md5Cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations internally
     * to work around bugs in some JS interpreters.
     */
    function safeAdd(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    function bitRol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }


    /*
     * NTLM hash and session key calculations
     */
    function ntlmResponse(password, challenge) {
        function get7Bits(input, startBit) {
            var word = 0;
            word = input.charCodeAt(startBit / 8) << 8;
            word |= input.charCodeAt(startBit / 8 + 1);
            word >>= 15 - (startBit % 8 + 7);
            return String.fromCharCode(word & 0xfe);
        }

        function makeKey(input) {
            return get7Bits(input, 0) +
                get7Bits(input, 7) +
                get7Bits(input, 14) +
                get7Bits(input, 21) +
                get7Bits(input, 28) +
                get7Bits(input, 35) +
                get7Bits(input, 42) +
                get7Bits(input, 49);
        }

        challenge = hex2str(challenge);
        var ntKey = strMd4Ucs2(password);
        var key1 = makeKey(ntKey.substr(0, 7));
        var key2 = makeKey(ntKey.substr(7, 7));
        var key3 = makeKey(ntKey.substr(14, 2) + "\0\0\0\0\0");
        return str2hex(des(key1, challenge, true) + des(key2, challenge, true) + des(key3, challenge, true));
    }

    function ntlmSessionKey(password) {
        return hexMd4(strMd4Ucs2(password));
    }

    // public interface
    return {
        str2hex: str2hex,
        hex2str: hex2str,
        sha1: function (string) { return SHA1(string); },
        sha256: function (string) { return SHA256(string); },
        rc4: rc4,
        ntlmResponse: ntlmResponse,
        ntlmSessionKey: ntlmSessionKey,
        md5: hexMd5
    };
}());
