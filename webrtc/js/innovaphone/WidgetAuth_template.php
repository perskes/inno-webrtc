<?php

//header('Access-Control-Allow-Origin: *');


// customer edit
$username		= "webrtc"; //webrtc "Benutzername"
$password		= "???"; // webrtc "Password"
$realm			= "???"; // PBX-Name

// get parameter
$sessionID		= $_GET['SID'];
$serverNonce	= $_GET['SNO'];

// get parameter
$sessionID		= $_GET['SID'];
$serverNonce	= $_GET['SNO'];

// random
$clientNonce	= strval(mt_rand(1, mt_getrandmax()));

// PHP hash^function
$input = "innovaphonePbxWebsocket:ClientAuth:" . $realm . ":" . $sessionID . ":" . $username . ":" . $password . ":" . $clientNonce . ":" . $serverNonce;
$digest = hash("sha256", $input);

// output
echo '<?xml version="1.0"?>';
echo '<authentication>';
	echo '<username>' . $username . '</username>';
	echo '<clientNonce>' . $clientNonce . '</clientNonce>';
	echo '<digest>' . $digest . '</digest>';
echo '</authentication>';

?>