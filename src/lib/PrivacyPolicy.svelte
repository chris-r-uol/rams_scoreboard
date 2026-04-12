<div class="min-h-screen bg-gray-950 text-gray-300 select-text">
  <div class="max-w-3xl mx-auto px-6 py-12">
    <a href="#/" class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8 inline-block">← Back to Controller</a>

    <h1 class="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
    <p class="text-sm text-gray-500 mb-10">Effective date: 12 April 2026 &nbsp;·&nbsp; Last updated: 12 April 2026</p>

    <div class="space-y-8 text-sm leading-relaxed">

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">1. Introduction</h2>
        <p>
          This Privacy Policy explains how <strong class="text-white">Rams Scoreboard</strong> ("the Application", "we", "us", or "our")
          handles information when you use the application. We are committed to protecting your privacy and being transparent
          about our data practices.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">2. Data Controller</h2>
        <p>
          The Application is operated as an open-source, locally-run desktop and web tool. There is no central data controller
          or corporate entity collecting your data. All processing described in this policy occurs exclusively on your own device.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">3. Information We Collect</h2>
        <p><strong class="text-white">We do not collect any personal data.</strong></p>
        <p class="mt-2">The Application processes the following categories of information, all of which remain entirely on your local machine:</p>
        <ul class="list-disc pl-6 mt-2 space-y-1">
          <li><strong class="text-white">Game state data</strong> — team names, scores, clock values, quarter, down and distance, possession indicator, timeout counts, and penalty flag status.</li>
          <li><strong class="text-white">Team branding preferences</strong> — colour values (hex codes) for primary, secondary, and text colours per team.</li>
        </ul>
        <p class="mt-2">
          This information is entered manually by the operator during use and exists only in volatile memory (RAM) for the
          duration of the session. It is not written to disk, not stored in databases, and not transmitted to any external server.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">4. How Information Is Used</h2>
        <p>Game state data is used solely to:</p>
        <ul class="list-disc pl-6 mt-2 space-y-1">
          <li>Render the operator dashboard (Controller view).</li>
          <li>Render the broadcast overlay (OBS Browser Source view).</li>
          <li>Synchronise state between the Controller and Overlay views in real time.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">5. Data Transmission</h2>
        <p>The Application uses two local synchronisation mechanisms:</p>
        <ul class="list-disc pl-6 mt-2 space-y-1">
          <li><strong class="text-white">BroadcastChannel API</strong> — an in-browser messaging channel that operates within a single browser process. Data never leaves the device.</li>
          <li><strong class="text-white">WebSocket relay</strong> — a local server bound to <code class="bg-gray-800 px-1.5 py-0.5 rounded text-xs text-gray-200">127.0.0.1:5199</code> (localhost only). This relay facilitates communication between the browser and OBS Browser Source on the same machine. The relay does not accept connections from external networks and does not forward data to any remote endpoint.</li>
        </ul>
        <p class="mt-2">
          <strong class="text-white">No data is transmitted over the internet, to third-party services, or to any server outside your local machine.</strong>
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">6. Data Storage &amp; Retention</h2>
        <p>
          The Application does not persist any data to disk. All game state is held in volatile memory and is
          discarded when the application window is closed or the page is refreshed. There are no databases,
          log files, local storage entries, cookies, or cached data created by the Application.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">7. Cookies &amp; Tracking</h2>
        <p>
          The Application does not use cookies, web beacons, pixel tags, or any form of tracking technology.
          No analytics services (such as Google Analytics, Mixpanel, or similar) are integrated or invoked.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">8. Third-Party Services</h2>
        <p>
          The Application does not integrate with, send data to, or receive data from any third-party service,
          API, or platform. The OBS integration operates entirely through a local Browser Source connection
          and does not involve OBS's own network services.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">9. Children's Privacy</h2>
        <p>
          The Application does not knowingly collect or process any personal data from anyone, including
          children under the age of 13 (or the applicable age of digital consent in your jurisdiction).
          Because no personal data is collected at all, no age-specific data handling applies.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">10. Security</h2>
        <p>
          Because all data remains on your local device and is never transmitted externally, the attack surface
          is limited to your own machine's security posture. The WebSocket relay binds exclusively to
          <code class="bg-gray-800 px-1.5 py-0.5 rounded text-xs text-gray-200">127.0.0.1</code> and is not
          accessible from other devices on your network. The embedded HTTP server (in production builds) also
          binds exclusively to <code class="bg-gray-800 px-1.5 py-0.5 rounded text-xs text-gray-200">127.0.0.1</code>.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">11. Your Rights</h2>
        <p>
          Under applicable data protection legislation (including the UK GDPR, EU GDPR, and the California
          Consumer Privacy Act), you have the right to access, correct, delete, and port your personal data.
          Because this Application collects no personal data, these rights are satisfied by default — there is
          no data to access, correct, delete, or port.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">12. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Any changes will be reflected by updating the
          "Last updated" date at the top of this page. Continued use of the Application after changes are
          posted constitutes acceptance of the revised policy.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">13. Contact</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy, please open an issue on the
          project's source code repository.
        </p>
      </section>

    </div>

    <div class="mt-12 pt-6 border-t border-gray-800 text-xs text-gray-600">
      © 2026 Rams Scoreboard. All rights reserved.
    </div>
  </div>
</div>
