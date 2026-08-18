function PostCard({ post }) {
  return (
    <div className="post-card">

      <div className="post-header">
        <img
          src={post.user?.profilePicture || "https://i.pravatar.cc/50"}
          alt=""
          className="avatar"
        />

        <div>
          <h4>{post.user?.fullName}</h4>
          <p>@{post.user?.username}</p>
        </div>
      </div>

      <img
        src={post.image}
        alt=""
        className="post-image"
      />

      <div className="post-content">
        <p>{post.caption}</p>

        <div className="post-actions">
          ❤️ {post.likes?.length || 0}
        </div>
      </div>

    </div>
  );
}

export default PostCard;