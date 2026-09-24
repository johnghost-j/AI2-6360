import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import Console from "./pages/console";
import Activity from "./pages/activity";
import Tasks from "./pages/tasks";
import Workspace from "./pages/workspace";
import Settings from "./pages/settings";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Console} />
        <Route path="/activity" component={Activity} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/workspace" component={Workspace} />
        <Route path="/settings" component={Settings} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
