const mongoose = require('mongoose')
const Schema = mongoose.Schema

const CommentSchema = new Schema({

  author          : { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorUsername  : { type: String, required: true },
  content         : { type: String, required: true },
  postId          : { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  postTitle       : { type: String }

})

module.exports = mongoose.model('Comment', CommentSchema)
