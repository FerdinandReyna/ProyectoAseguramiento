function SourceCodeLink({ left, right }) {
  let position = "";
  if (left) position = "left";
  else if (right) position = "right";

  return (
    <ul className={`nav navbar-nav pull-xs-${position}`}>
      <li className="nav-item">
        <a
          className="nav-link"
          href="https://github.com/TonyMckes/conduit-realworld-example-app"
        >
          <i className="ion-social-github"></i> Source code
        </a>
      </li>
    </ul>
  );
}

export default SourceCodeLink;
