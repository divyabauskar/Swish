import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import '../components/Layout.css';

function Home() {
  let stories = ["Coding Club", "Aarav", "Drama Soc", "Debate"];

  return (
    <div className="page-wrapper">
      <BottomNav />

      <div className="app-shell">
        <Navbar />

        <div className="feed-header">
          <p className="eyebrow">For You</p>
          <h1>Happening on campus</h1>
          <p className="subtext">Tuned to the accounts you follow, plus what campus can't stop talking about.</p>
        </div>

        <div className="stories-row">
          <div className="story story-add">
            <div className="story-ring add-ring">+</div>
            <span>Your story</span>
          </div>

          {stories.map((name) => (
            <div className="story" key={name}>
              <div className="story-ring"></div>
              <span>{name}</span>
            </div>
          ))}
        </div>

        <div className="feed-placeholder">
          {/* Posts/feed content goes here — built by teammate */}
        </div>
      </div>
    </div>
  );
}

export default Home;