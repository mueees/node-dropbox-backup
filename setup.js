var fs = require('fs'),
    util = require('util'),
    dbox = require('dbox'),
    stdin = process.openStdin();

try
{
	var config = fs.readFileSync('config.json')
}
catch (e)
{
	util.error('Config file ' + e.path + ' not found.')
	return
}

config = config.toString('utf-8')

try
{
	config = JSON.parse(config)	
}
catch (e)
{
	util.error('Config file is not in valid JSON format.')
	return
}

var app = dbox.app({
	'app_key': config.app_key,
	'app_secret': config.app_secret
})

app.requesttoken(function(status, request_token)
{
	if (status != 200)
	{
		util.error('Error requesting token: Did you put the app key and secret in config.json?')
		return
	}

	util.puts('Open the following URL in your browser and authorize the app:\n')
	util.puts(request_token.authorize_url)
	util.puts('\nPress return when it\'s done.')

	stdin.once('data', function()
	{
		app.accesstoken(request_token, function(status, access_token)
		{
			if (status != 200)
			{
				console.log(access_token)
			}
			else
			{
				config.access_token = access_token
				fs.writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf-8')
				console.log('Access token set up successfuly')
			}

			process.exit()
		})
	})
})