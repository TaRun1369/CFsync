require('dotenv').config();
const express = require('express');

const GitHubStrategy = require('passport-github').Strategy;

const passport = require('passport');
const session = require('express-session');
const app = express();



app.use(session({
    secret : "keyboard cat",
    resave : false,
    saveUninitialized : false,
    cookie : {
        httpOnly:true,
        secure:false, // true in https 
        maxAge: 1000*60*60*24,
    }
  }))

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function(user, cb){
    cb(null, user.id);
});

passport.deserializeUser(function(id, cb){
    cb(null, id);
});

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
    callbackURL: "http://localhost:3000/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // User.findOrCreate({ githubId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });
    // const accessToken1 = accessToken;
    profile.accessToken = accessToken; // Storing accessToken in user profile
    console.log(profile);
    cb(null,profile);
  }
));

const isAuth = (req, res, next) => {
    if(req.user){
        next();
    }else{
        res.redirect('/login');
    }
}

app.get('/', isAuth,(req, res) => {
    console.log(req.user);
    res.sendFile(__dirname+"/dashboard.html");
});


app.get('/login', (req, res) => {
    if(req.user){
        return res.redirect('/');
    }
    res.sendFile(__dirname+"/login.html");
});


// app.get('/logout', (req, res) => {
//     req.logOut();
//     res.redirect('/login');
// });
app.get('/logout', (req, res) => {
    req.logout(function(err) {
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
  function(req, res) {
    // Successful authentication, redirect home.
    // res.send(accessToken1);
    res.redirect('/');
    // res.send(accessToken1);
  });

// repo name 
app.get('/repo', isAuth, (req, res) => {
    res.sendFile(__dirname+"/repo.html");
});



const linkRepo = (accessToken, repositoryName) => {
    const repositoryAuthenticationURL = `https://api.github.com/repos/${repositoryName}`;
  
    const xhttp = new XMLHttpRequest();
    xhttp.addEventListener('readystatechange', function () {
      if (xhttp.readyState === 4) {
        const responseText = JSON.parse(xhttp.responseText);
        const linkFlag = linkRepoStatusCode(xhttp.status, repositoryName);
        if (xhttp.status === 200) {
          if (!linkFlag) {
  
            chrome.storage.local.set({ current_phase: 'link_repo' }, () => {
              console.log(`Error linking ${repositoryName}.`);
            });
  
            chrome.storage.local.set({ github_LinkedRepository: null }, () => {
              console.log('Set Repository link to null');
            });
  
            document.getElementById('link_repo_phase').style.display = 'inherit';
            document.getElementById('solve_and_push_phase').style.display = 'none';
          } 
          
          else {
            chrome.storage.local.set(
              {current_phase:'solve_and_push', repo: responseText.html_url},
              () => {
                $('#error_info').hide();
                $('#success_acknowledgement').html(`Successfully linked <a target="blank" href="${responseText.html_url}">${repositoryName}</a> to 'GfG To GitHub'. Start solving on <a href="https://www.geeksforgeeks.org/explore">GeeksforGeeks</a>&nbsp; now!`,);
                $('#success_acknowledgement').show();
                $('#unlinkRepository').show();
              },
            );
  
            chrome.storage.local.set(
              { github_LinkedRepository: responseText.full_name }, () => {
                console.log('Linked Repository Successfully');
                chrome.storage.local.get('userStatistics', (solvedProblems) => {
                  const { userStatistics } = solvedProblems;
                  if (userStatistics && userStatistics.solved) {
                    $('#successful_submissions').text(userStatistics.solved);
                    $('#successful_submissions_school').text(userStatistics.school);
                    $('#successful_submissions_basic').text(userStatistics.basic);
                    $('#successful_submissions_easy').text(userStatistics.easy);
                    $('#successful_submissions_medium').text(userStatistics.medium);
                    $('#successful_submissions_hard').text(userStatistics.hard);
                  }
                });
              },
            );
            document.getElementById('link_repo_phase').style.display = 'none';
            document.getElementById('solve_and_push_phase').style.display = 'inherit';
          }
        }
      }
    });
  
    xhttp.open('GET', repositoryAuthenticationURL, true);
    xhttp.setRequestHeader('Authorization', `token ${accessToken}`);
    xhttp.setRequestHeader('Accept', 'application/vnd.github.v3+json');
    xhttp.send();
  };
  


app.listen(3000, () =>console.log('Server is running on port 3000'));