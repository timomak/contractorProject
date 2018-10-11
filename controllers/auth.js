const jwt = require('jsonwebtoken');
const User = require('../models/user');
module.exports = (app) => {

  // SIGN UP FORM
  app.get('/sign-up', (req, res) => {
    res.render('sign-up');
  });

  // LOGIN FORM
  app.get('/login', (req, res) => {
    res.render('login.handlebars');
  });
}
