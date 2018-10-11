const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const UserSchema = new Schema({
    username        : { type: String, required: true },
    password        : { type: String, select: false },
    createdAt       : { type: Date },
    updatedAt       : { type: Date },
    posts           : [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    comments        : [{ type: Schema.Types.ObjectId, ref: 'Comment' }]
});

// Must use function here! ES6 => functions do not bind this!
UserSchema.pre('save', function(next) {
  // SET createdAt AND updatedAt
  const now = new Date();
  this.updatedAt = now;
  if ( !this.createdAt ) {
    this.createdAt = now;
  }

  // ENCRYPT PASSWORD
  const user = this;
  if (!user.isModified('password')) {
    return next();
  }
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(user.password, salt, (err, hash) => {
      user.password = hash;
      console.log("user.password: ", user.password);
      next();
    });
  });
});


// UserSchema.methods.comparePassword = (password, done) => {
//   bcrypt.compare(password, this.password, (err, isMatch) => {
//     done(err, isMatch);
//     console.log("Is match: ",isMatch, "\n", "Error: ", err, "\n", "Password: ",password,"\n", "this.password: ",this.password);
//   });
// };

// bcrypt.hash('mypassword', 10, function(err, hash) {
//     if (err) { throw (err); }
//
// bcrypt.compare('mypassword', hash, function(err, result) {
//     if (err) { throw (err); }
//     console.log(result);

module.exports = mongoose.model('User', UserSchema);
