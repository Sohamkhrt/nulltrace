// Imported first in main.tsx so the wire tap wraps fetch() before any Firebase SDK call.
import { installWireTap } from './services/wireTap';

installWireTap();
