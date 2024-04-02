require('dotenv').config();
const express = require('express');

const GitHubStrategy = require('passport-github').Strategy;

const passport = require('passport');
const session = require('express-session');
const app = express();

app.set('view engine', 'ejs');


app.use(session({
  secret: "keyboard cat",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // true in https 
    maxAge: 1000 * 60 * 60 * 24,
  }
}))

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function (user, cb) {
  cb(null, user); // Serialize the complete user object
});

passport.deserializeUser(function (user, cb) {
  cb(null, user); // Deserialize the complete user object
});


passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_ID,
  clientSecret: process.env.GITHUB_SECRET,
  callbackURL: "http://localhost:3000/auth/github/callback"
},
  function (accessToken, refreshToken, profile, cb) {
    // User.findOrCreate({ githubId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });
    // const accessToken1 = accessToken;
    profile.accessToken = accessToken;
    // accessToken1 = profile.accessToken; // Storing accessToken in user profile
    console.log(profile);
    cb(null, profile);
  }
));

const isAuth = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

app.get('/', isAuth, (req, res) => {
  console.log(req.user);
  res.render('dashboard', { profile: req.user });
  // res.sendFile(__dirname+"/dashboard.html");
});


app.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.sendFile(__dirname + "/login.html");
});


// app.get('/logout', (req, res) => {
//     req.logOut();
//     res.redirect('/login');
// });
app.get('/logout', (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.error("Error during logout:", err);
      return next(err);
    }
    res.redirect('/login');
  });
});


// auth
app.get('/auth/github',
  passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    // res.send(accessToken1);

    res.redirect('/');
    // res.send(accessToken1);
  });

// repo name 
app.get('/repo', isAuth, (req, res) => {
  // Get the access token from the profile
  // res.render('repo', { accessToken: accessToken1 }); // Send the access token to the client
  res.sendFile(__dirname + "/repo.html");
  // res.redirect("/repo");
});



const fetch = require('node-fetch');

let previousId = null;


function fetchUserStatus(handle) {
  return fetch(`https://codeforces.com/api/user.status?handle=${handle}`)
    .then(response => response.json())
    .then(data => {
      // Get the most recent verdict
      const mostRecentVerdict = data.result[0];

      // If the ID of the most recent verdict matches the previous ID, return false
      if (mostRecentVerdict.id === previousId) {
        return false;
      }

      // Update the previous ID
      previousId = mostRecentVerdict.id;

      // Return the verdict
      return {verdict : mostRecentVerdict.verdict,
          id : mostRecentVerdict.id};
    })
    .catch(error => {
      console.error('Error:', error);
      return false;
    });
}

// Call the function with the handle you want to fetch every minute
setInterval(() => {
  fetchUserStatus('Failure101').then(result => {
    if (result === false) {
      console.log('No new verdicts');
    } else {
      console.log('New verdict:', result);
    }
  });
}, 60 * 1000); // 60 * 1000 milliseconds = 1 minute

app.listen(3000, () => console.log('Server is running on port 3000'));