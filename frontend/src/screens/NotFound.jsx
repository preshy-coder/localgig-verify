import { BackToBrowse, NoticeScreen } from '../components/Feedback.jsx';
import { useTitle } from '../lib/useTitle.js';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <NoticeScreen title="We can't find that page" actions={<BackToBrowse />}>
      The address may be mistyped, or the page may have moved.
    </NoticeScreen>
  );
}
