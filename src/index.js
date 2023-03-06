const express = require('express');
const { port, clientId, clientSecret } = require('./config.js');
const request = require('request');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.static(__dirname));
app.use(cookieParser());

app.get('/', (request, response) => {
    return response.sendFile('index.html', { root: '.' });
});

app.get('/auth/discord', function(req, res) {
    const cookie = req.cookies.access_token;
    if (cookie) {
        res.redirect('/userinfo');
    } else {
        const redirectUri = 'http://localhost:80/auth/discord/callback'; // This is the URL that Discord will redirect the user to after authentication
        const scopes = 'identify email'; // The scopes that your app needs to access
        const authorizationUrl = `https://discordapp.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}`;
        res.redirect(authorizationUrl);
    }
});

app.get('/auth/discord/callback', function(req, res) {
    const code = req.query.code;
    const redirectUri = 'http://localhost:80/auth/discord/callback'; // This must match the redirect URI that you specified when creating the Discord application
    const tokenUrl = 'https://discordapp.com/api/oauth2/token';

    const options = {
        url: tokenUrl,
        method: 'POST',
        form: {
            code: code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            scope: 'identify email'
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    request(options, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            const tokenResponse = JSON.parse(body);
            const accessToken = tokenResponse.access_token;
            const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            res.cookie('access_token', accessToken, { expires: expiryDate });
            res.redirect('/userinfo');
        } else {
            res.send('Error: ' + error);
        }
    });

    app.get('/userinfo', function(req, res) {
        const accessToken = req.cookies.access_token;
        const userUrl = 'https://discordapp.com/api/users/@me';

        const options = {
            url: userUrl,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        };

        request(options, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                const user = JSON.parse(body);
                const username = user.username;
                const tag = user.discriminator;
                res.send(`Username: ${username}#${tag}`);
            } else {
                res.send('Error: ' + error);
                res.redirect('/auth/discord');
            }
        });
    });
});


app.listen(port, () => console.log(`App listening at http://localhost:${port}`));
