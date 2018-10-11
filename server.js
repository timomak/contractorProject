// Everything is working thanks to Cenz

// SECURITY
require('dotenv').config();

// Required initializers
var cookieParser = require('cookie-parser');
var jwt = require('jsonwebtoken');
var express = require('express');
var app = express();
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/reddit-clone-tm');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var bcrypt = require('bcrypt');

// POST
require('./controllers/posts.js')(app);
var Post = require('./models/post');
// COMMENT
require('./controllers/comments-controller.js')(app);
var Comment = require('./models/comment');
// // USER
require('./controllers/auth.js')(app);
var User = require('./models/user');

// User logged Check
var checkAuth = (req, res, next) => {
  console.log("Checking authentication");
  if (typeof req.cookies.nToken === 'undefined' || req.cookies.nToken === null) {
    req.user = null;
    console.log("Authentication was not successfull!");
  } else {
    var token = req.cookies.nToken;
    var decodedToken = jwt.decode(token, { complete: true }) || {};
    req.user = decodedToken.payload;
    console.log("Authentication was successfull!");
  }

  next()
}

// Set up
mongoose.Promise = global.Promise;
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(express.static('public'));
// mongoose.connect('mongodb://localhost:27017/reddit-clone');
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection Error:'))
mongoose.set('debug', true)
app.use(bodyParser.urlencoded({ extended: true }));
// app.listen(3000, () => console.log('It Loads on port 3000!'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(checkAuth);

Post.find({}).then((posts) => {
  res.render('posts-index.handlebars', { posts })
}).catch((err) => {
  console.log(err.message);
})

// Create
app.post('/posts', (req, res) => {
  if (req.user) {
    var post = new Post(req.body);
    post.author = req.user._id
    console.log("author: ", req.user);
    console.log("author Username: ", req.user.username);
    post.authorUsername = req.user.username

    post.save().then((post) => {
      return User.findById(req.user._id)
    }).then((user) => {
      user.posts.unshift(post);
      user.save();
      // REDIRECT TO THE NEW POST
      res.redirect('/posts/'+ post._id)
    }).catch((err) => {
      console.log(err.message);
    });
  } else {
    return res.status(401); // UNAUTHORIZED
  }
});

// INDEX
app.get('/', (req, res) => {
  if (req.user) {
    var currentUser = req.user;

    User.findById(currentUser._id).then((currentUsername) => {
      Post.find({}).then((posts) => {
        res.render('post-index', { currentUsername, posts, currentUser })
      })
    }).catch((err) => {
      console.log(err.message);
    });
  } else {
    var currentUser = req.user;
    Post.find({}).then((posts) => {
      res.render('post-index', {  posts, currentUser })
    }).catch((err) => {
      console.log(err.message);
    });
  }
})
// SUBREDDIT
app.get('/n/:subreddit', function(req, res) {
  if (req.user) {
    var currentUser = req.user;
    User.findById(currentUser._id).then((currentUsername) => {
      Post.find({ subreddit: req.params.subreddit }).then((posts) => {
        var subredditName = posts[0].subreddit;
        console.log("subreddit name: ", subredditName);
        res.render('post-subreddit.handlebars', { currentUsername, subredditName, posts, currentUser })
      })
    }).catch((err) => {
      console.log(err)
    })
  } else {
    var currentUser = req.user;
    Post.find({ subreddit: req.params.subreddit }).then((posts) => {
      var subredditName = posts[0].subreddit;
      res.render('post-subreddit.handlebars', { subredditName, posts, currentUser })
    }).catch((err) => {
      console.log(err)
    })
  }
});

// Page to Create New Post
app.get('/posts/new', (req, res) => {
  var currentUser = req.user;
  User.findById(currentUser._id).then((currentUsername) => {
    res.render('posts-new', { currentUsername, currentUser });
  })
})

// Post page
app.get('/posts/:id', function (req, res) {
  if (req.user) {
    var currentUser = req.user;
    // LOOK UP THE POST
    User.findById(currentUser._id).then((currentUsername) => {
      Post.findById(req.params.id).populate('comments').then((post) => {
        res.render('post-show.handlebars', { currentUsername, post, currentUser})
      })
    }).catch((err) => {
      console.log(err.message)
    })
  } else {
    var currentUser = req.user;
    // LOOK UP THE POST
    Post.findById(req.params.id).populate('comments').then((post) => {
      res.render('post-show.handlebars', { post, currentUser})
    }).catch((err) => {
      console.log(err.message)
    })
  }
})

// CREATE Comment
app.post('/posts/:postId/comments', function (req, res) {
  // INSTANTIATE INSTANCE OF MODEL
  var comment = new Comment(req.body);
  var titleOfPost;

  // SAVE INSTANCE OF Comment MODEL TO DB
  comment.save().then((comment) => {
    return User.findById(req.user._id)
  }).then((user) => {
    user.comments.unshift(comment);
    user.save();
  }).then((comment) => {
    return Post.findById(req.params.postId)
  }).then((post) => {
    console.log("post title: ", post.title);
    titleOfPost = post.title;
    post.comments.unshift(comment)
    return post.save()
  }).then((post) => {
    res.redirect(`/posts/`+ post._id)
  }).catch((err) => {
    console.log(err)
  })
  comment.author = req.user._id
  comment.authorUsername = req.user.username
  comment.postId = req.params.postId
  comment.postTitle = titleOfPost
})
// SIGN UP POST
app.post('/sign-up', (req, res) => {
  var username = req.body.signupUsername;
  var password = req.body.signupPassword;
  var passwordCheck = req.body.signupConfirmPassword;
  var remember = req.body.rememberMeCheck;

  if (password == passwordCheck) {
    // Create User and JWT
    const user = new User({
        username,
        password
      });

    user.save().then((user) => {
        var token = jwt.sign({ _id: user._id, username: user.username  }, process.env.SECRET, {
          expiresIn: "60 days"
        });
        if (remember == "yes") {
          res.cookie('nToken', token, { maxAge: 90000000, httpOnly: true });
        }
        res.redirect('/');
    }).catch((err) => {
        console.log(err.message);
        return res.status(400).send({ err: err });
      });
  }else {
    console.log("Password doesn't match.");
    res.redirect('/sign-up');
  }
});

// LOGOUT
app.get('/logout', (req, res) => {
  res.clearCookie('nToken');
  res.redirect('/');

});

// LOGIN
app.post('/login', (req, res) => {
  var username = req.body.username;
  var password = req.body.password;
  var remember = req.body.remember;
  // Find this user name
  User.findOne({ username }, 'username password').then((user) => {
    if (!user) {
      // User not found
      return res.status(401).send({ message: 'No Such user' });
    }
    // Check the password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (!isMatch) {
        console.log("Is match: ",isMatch, "\n", "Error: ", err);
        console.log("You Entered: ",password,'\n',"Correct password: ",user.password,'\n User Name: ', user.username );
        // Password does not match
        return res.status(401).send({ message: "Wrong password"});
      }
      // Create a token
      var token = jwt.sign(
        { _id: user._id, username: user.username }, process.env.SECRET,
        { expiresIn: "60 days" }
      );
      // Set a cookie and redirect to root
      if (remember == "yes") {
        res.cookie('nToken', token, { maxAge: 90000000, httpOnly: true });
      }
      res.redirect('/');
    });
  }).catch((err) => {
    console.log(err);
  });
});

// USER PROFILE
app.get('/users/:username', (req, res) => {
  var currentUser = req.user;
  User.findById(currentUser._id).then((currentUsername) => {
    User.find({username: req.params.username}).then((array) => {
      var users = array[0];
      console.log("users: ", users);
      console.log("users comments: ", users.comments);
      Post.find({authorUsername: req.params.username}).then((posts) => {
        console.log("posts: ", posts);
        Comment.find({authorUsername: req.params.username}).then((comments) => {
          console.log("comments: ", comments);
          // Post.findById(comments[0].postId).then((post) => {
          //   var postTitle = post.title;
          //   console.log("post Title: ", postTitle);
          res.render('user-index.handlebars', { comments, currentUsername, users, posts, currentUser })
          // })
        })
      })
    })
  }).catch((err) => {
    console.log(err)
  })
})

app.get('/profile', (req, res) => {
  if (req.user) {
    // var currentUser = req.user;
    var currentUsername = req.user.username;
    res.redirect(`/users/`+ currentUsername)
  }else {
    res.redirect('/')
  }
})
const port = process.env.PORT || 27017;
app.listen(port);
