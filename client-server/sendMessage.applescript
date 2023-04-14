on run {targetGroupId, targetMessage}
	tell application "Messages"
		set targetBuddy to first chat whose id is targetGroupId
		send targetMessage to targetBuddy
	end tell
end run
