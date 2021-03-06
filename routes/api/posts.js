const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

const Post = require('../../models/Post');
const Profile = require('../../models/Profile');

// Load Post validation
const validatePostInput = require('../../validation/post');

//@route        GET api/posts/test
//@desc         Tests posts route
//@access        public route
router.get('/test', (req, res) => res.json({
    msg: 'Posts works'
}));

//@route        GET api/posts
//@desc         Gets all posts
//@access        public route
router.get('/', (req, res) => {
    Post.find().sort({
            date: -1
        })
        .then(posts => res.json(posts))
        .catch(err => res.status(404).json({
            nopostsfound: "No posts found with that id"
        }))
})

//@route        GET api/posts/:id
//@desc         Get post by id
//@access        public route
router.get('/:id', (req, res) => {
    Post.findById(req.params.id)
        .then(post => res.json(post))
        .catch(err => res.status(404).json({
            nopostfound: "No post found with that id"
        }))
})

//@route        POST api/posts
//@desc         Create post
//@access        private route
router.post('/', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    const {
        errors,
        isValid
    } = validatePostInput(req.body);

    // Check validation
    if (!isValid) {
        // IF any errors, send 400 with errors object
        return res.status(400).json(errors);
    }

    const newPost = new Post({
        text: req.body.text,
        name: req.body.name,
        avatar: req.body.avatar,
        user: req.user.id
    })

    newPost.save().then(post => res.json(post));
})

//@route        DELETE api/posts/:id
//@desc         Delete post
//@access        private route
router.delete('/:id', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    Profile.findOne({
            user: req.user.id
        })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    //Check for post owner
                    if (post.user.toString() !== req.user.id) {
                        return res.status(401).json({
                            notauthorized: 'user not authorized'
                        });
                    }

                    //Delete 
                    post.remove().then(() => res.json({
                        success: true
                    })).catch(err => res.status(404).json({
                        postnotfound: 'No post found'
                    }))
                })
        })
})

//@route        POST api/posts/like/:id
//@desc         Like post
//@access        private route
router.post('/like/:id', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    Profile.findOne({
            user: req.user.id
        })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    if (post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
                        return res.status(400).json({
                            alreadyliked: 'USer already like post'
                        })
                    }

                    //Add user id to likes array
                    post.likes.unshift({
                        user: req.user.id
                    })

                    post.save().then(post => res.json(post))
                })
                .catch(err => res.status(404).json({
                    postnotfound: 'Post not found'
                }));
        })
})

//@route        POST api/posts/unlike/:id
//@desc         Unlike post
//@access        private route
router.post('/unlike/:id', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    Profile.findOne({
            user: req.user.id
        })
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    if (post.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
                        return res.status(400).json({
                            notliked: 'You have not liked this post'
                        })
                    }
                    //Get remove index
                    const removeIndex = post.likes.map(item => item.user.toString()).indexOf(req.user.id);
                    //Splice out of array
                    post.likes.splice(removeIndex, 1);

                    post.save()
                        .then(post => res.json(post))

                })
                .catch(err => res.status(404).json({
                    postnotfound: 'No post found'
                }));
        })
})

//@route        POST api/posts/comment/:id
//@desc         Add comment to post
//@access        private route
router.post('/comment/:id', passport.authenticate('jwt', {
    session: false
}), (req, res) => {
    const {
        errors,
        isValid
    } = validatePostInput(req.body);

    // Check validation
    if (!isValid) {
        // IF any errors, send 400 with errors object
        return res.status(400).json(errors);
    }

    Post.findById(req.params.id)
        .then(post => {
            const newComment = {
                text: req.body.text,
                name: req.body.name,
                avatar: req.body.avatar,
                user: req.user.id
            }

            //Add to comments array
            post.comments.unshift(newComment);

            post.save().then(post => res.json(post))
        })
        .catch(err => res.status(404).json({
            postnotfound: 'No post found'
        }))
})

//@route        DELETE api/posts/comment/:id/:comment_id
//@desc         Remove comment from post
//@access        private route
router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', {
    session: false
}), (req, res) => {

    Post.findById(req.params.id)
        .then(post => {
            //Check to see if comment exists
            if (post.comments.filter(comment => comment._id.toString() === req.params.comment_id).lenght === 0) {
                return res.status(404).json({
                    commentnotexists: 'comment does not exist'
                })
            }

            // Get remove index
            const removeIndex = post.comments.map(comment => comment._id.toString()).indexOf(req.params.comment_id);

            //Splice comment from array
            post.comments.splice(removeIndex, 1);

            post.save().then(post => res.json(post));


        })
        .catch(err => res.status(404).json({
            postnotfound: 'No post found'
        }))
})


module.exports = router;