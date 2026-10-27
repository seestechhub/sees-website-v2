import { Input } from '@/components/ui/input';
import { ActionForm } from './form';
import { subscribe } from '@/app/actions';
export function Subscribe() {
    return <section className="subscribe-panel">
    <div><p className="eyebrow">STAY IN THE LOOP</p><h2>A little SEES in your inbox.</h2><p>Choose to receive our newsletter. We’ll send a link to confirm your email first.</p></div>
    <ActionForm action={subscribe} label="Subscribe to the newsletter">
      <label className="field">Your email<Input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      <label className="checkbox"><Input type="checkbox" name="consent" required/>I’d like SEES newsletter emails. I can unsubscribe at any time.</label>
    </ActionForm>
  </section>;
}
