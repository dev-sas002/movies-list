import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";

import "./index.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

const App = React.lazy(() => import("./App"));

root.render(
  <React.StrictMode>
    {/* A lazily-loaded component must sit inside a Suspense boundary,
        otherwise React throws on the first render. */}
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </React.StrictMode>
);
