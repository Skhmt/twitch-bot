/*
	Copyright (C) 2016  skhmt

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation version 3.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
	message.js deals with raw messages, necessary if using ircv3 (twitch.tv/tags)
*/

// gets a message object
function parseMsg( command, args, user ) {
	if ( command == "JOIN" ) {
		msgJoin( user, args );
		return;
	}

	switch( args[1] ) {
		case "NOTICE":
			msgNotice( args );
			break;
		case "PRIVMSG":
			msgPriv( command, args );
			break;
		case "ROOMSTATE":
			msgRoom( command, args );
			break;
		default:
			break;
	}
}

/* NOTICE:
	Command: @msg-id=host_on
	Args 0: tmi.twitch.tv NOTICE #skhmt :Now hosting CoolidgeHD.
*/
function msgNotice( args ) {
	var output = "* ";

	output += args[3].substring(1); // removing the :

	// reconstructing the string after it was split by " "
	for ( var i = 4; i < args.length; i++ ) {
		output += ` ${args[i]}`;
	}

	log( output );
}

/* MESSAGE:
	Command: @color=#1E90FF;display-name=Skhmt;emotes=;mod=0;subscriber=0;turbo=0;user-id=71619374;user-type=mod
	Args 0: skhmt!skhmt@skhmt.tmi.twitch.tv PRIVMSG #skhmt :test
*/
function msgPriv( command, args ) {
	var commands = command.split( ";" );

	var color = commands[0].substring(7); // #1E90FF
	if ( color === "" ) color = "#d2691e";

	var subscriber = false;
	if ( commands[5].substring(11) === "1" ) subscriber = true;
	
	var turbo = false;
	if ( commands[6].substring(6) === "1" ) turbo = true;

	var mod = false;
	if ( commands[3].substring(4) === "1" ) mod = true;

	var from = commands[1].substring(13);
	if ( from === "" ) { // some people don't have a display-name, so getting it from somewhere else as a backup
		var tempArgs = args[0].split( "!" );
		from = tempArgs[0];
	}

	var userType = commands[7].substring(10);

	// writing output and setting timestamp
	var output = getTimeStamp() + " ";

	// output icons and such
	if ( settings.channel.substring(1) === from.toLowerCase() ) output += "<img src='http://chat-badges.s3.amazonaws.com/broadcaster.png'>";
	if ( mod ) output += "<img src='http://chat-badges.s3.amazonaws.com/mod.png'>";
	if ( subscriber ) output += `<img src='${subBadgeUrl}' />`;
	if ( turbo ) output += "<img src='http://chat-badges.s3.amazonaws.com/turbo.png'>";

	// output FROM info
	output += `<b style='color: ${color};'>${from}</b>`;
	

	// reconstructing the string after it was split by " "
	var text = args[3].substring(1);
	 // ACTION:
		// Command: @color=#1E90FF;display-name=Skhmt;emotes=;subscriber=0;turbo=0;user-id=71619374;user-type=
		// Args 0: skhmt!skhmt@skhmt.tmi.twitch.tv PRIVMSG #skhmt :ACTION does things
	
	if ( text === "\001ACTION" ) {
		text = `<span style='color: ${color};'>`; // remove the word "ACTION" from the action
		for ( var i = 4; i < args.length; i++ ) { // construct "text"
			text += " " + args[i].replace(/</g,"&lt;").replace(/>/g,"&gt;");
		}
		text += "</span>"; // close the bold tag
		
		moderation( from, mod, text );
		return log( output + text );
	}
	
	// not an action 
	output += "<b>:</b> "; // close the bold tag for the first half
	for ( var i = 4; i < args.length; i++ ) { // continue constructing "text" as normal
		text += " " + args[i].replace(/</g,"&lt;").replace(/>/g,"&gt;");
	}

	log( output + text );
	
	// if it's a command, send to parseCommand
	if ( text.substring(0,1) === cmdSettings.symbol ) {
		parseCommand( text, from, mod, subscriber );
	}
	
	moderation( from, mod, text );
}


/* ROOMSTATE
	command: @broadcaster-lang=;r9k=0;slow=0;subs-only=0
		     @broadcaster-lang=;r9k=1;slow=120;subs-only=1
	Args 0: tmi.twitch.tv ROOMSTATE #skhmt
*/
function msgRoom( command, args ) {
	var commands = command.split(";");
	var r9k = commands[1].substring(4);
	var slow = commands[2].substring(5);
	var subsOnly = commands[3].substring(10);
	
	if ( r9k == 0 && slow == 0 && subsOnly == 0 ) {
		log( `* No roomstate options set for ${args[2]}` );
	} else {
		var output = `* Roomstate options for ${args[2]}:`;
		if ( r9k === 1 ) output += " r9k";
		if ( slow > 0 ) output += ` slow(${slow})`;
		if ( subsOnly === 1 ) output += " subscribers-only";
		
		log( output );
	}
}


/* JOIN:
	Command: JOIN
	User: nightbot
	Args 0: #m3rchant
*/
function msgJoin( user, args ) {
	log( `* ${user} has joined ${args[0]}` );
}

/* MODE:
	Command: MODE
	Args 0: #m3rchant //channel
	Args 1: +o //op
	Args 2: m3rchant //username
*/