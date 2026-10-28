/**
 * Cloudflare Worker in front of the PhotoStack container.
 *
 * Every visitor goes to the same single container ("demo"). Its disk is
 * wiped when it sleeps, which suits a read-only demo: on each start it
 * re-seeds the demo photos baked into the image and indexes them again.
 */
import { Container } from '@cloudflare/containers';

export class PhotoStack extends Container {
  defaultPort = 8000;
  sleepAfter = '30m';
  envVars = { DEMO_MODE: 'true' };
}

export default {
  async fetch(request: Request, env: { PHOTOSTACK: DurableObjectNamespace<PhotoStack> }) {
    return env.PHOTOSTACK.getByName('demo').fetch(request);
  },
};
