(() => {
  const cfg = window.OWPS_CONFIG || {};

  const hasSupabase = Boolean(
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    window.supabase
  );

  const db = hasSupabase
    ? window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY
      )
    : null;

  const shareForm = document.getElementById('shareForm');
  const checkForm = document.getElementById('checkForm');
  const shareMessage = document.getElementById('shareMessage');
  const checkMessage = document.getElementById('checkMessage');
  const results = document.getElementById('results');
  const profileCount = document.getElementById('profileCount');
  const resultLabel = document.getElementById('resultLabel');
  const scoreChips = document.getElementById('scoreChips');
  const distribution = document.getElementById('distribution');
  const totalCommunityCount = document.getElementById('totalCommunityCount');
  const communityScoreCounts = document.getElementById('communityScoreCounts');

  function validNoc(v) {
    return /^\d{5}$/.test(v);
  }

  function validScore(v) {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 130;
  }

  function setMsg(el, text, type = '') {
    el.textContent = text;
    el.className =
      'message' + (type ? ` ${type}` : '');
  }

  function localRows() {
    try {
      return JSON.parse(
        localStorage.getItem('owps-community-demo') || '[]'
      );
    } catch {
      return [];
    }
  }

  function saveLocal(row) {
    const rows = localRows();
    rows.push(row);

    localStorage.setItem(
      'owps-community-demo',
      JSON.stringify(rows)
    );
  }


  /* ==========================================
     SHARE SCORE
     ========================================== */

  shareForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    setMsg(shareMessage, '');

    const noc =
      document.getElementById('shareNoc').value.trim();

    const region =
      document.getElementById('shareRegion').value;

    const score =
      Number(document.getElementById('shareScore').value);


    if (!validNoc(noc)) {
      return setMsg(
        shareMessage,
        'Please enter a valid 5-digit NOC code.',
        'error'
      );
    }

    if (!region) {
      return setMsg(
        shareMessage,
        'Please select a region.',
        'error'
      );
    }

    if (!validScore(score)) {
      return setMsg(
        shareMessage,
        'Please enter a whole-number score from 1 to 130.',
        'error'
      );
    }


    const btn =
      shareForm.querySelector('button');

    btn.disabled = true;


    try {

      /*
        PROTECTED SUBMISSION

        Scores now go through the Supabase
        server function instead of inserting
        directly from the browser.
      */

      if (hasSupabase) {

        const response = await fetch(
          `${cfg.SUPABASE_URL}/functions/v1/submit-score`,
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json'
            },

            body: JSON.stringify({
              noc_code: noc,
              region: region,
              eoi_score: score
            })
          }
        );


        let responseData = {};

        try {
          responseData = await response.json();
        } catch {
          responseData = {};
        }


        if (!response.ok) {

          if (response.status === 429) {
            return setMsg(
              shareMessage,
              responseData.error ||
                'Please wait 2 minutes before submitting another score.',
              'error'
            );
          }

          throw new Error(
            responseData.error ||
            'Could not save score.'
          );
        }

      } else {

        saveLocal({
          noc_code: noc,
          region,
          eoi_score: score,
          created_at: new Date().toISOString()
        });

      }


      shareForm.reset();

      setMsg(
        shareMessage,
        hasSupabase
          ? 'Score shared. Thank you for helping the community.'
          : 'Saved in demo mode on this device.',
        'success'
      );


    } catch (err) {

      setMsg(
        shareMessage,
        'Could not save the score. Please try again.',
        'error'
      );

      console.error(err);

    } finally {

      btn.disabled = false;

    }
  });


  /* ==========================================
     CHECK COMMUNITY SCORES
     ========================================== */

  checkForm.addEventListener('submit', async (e) => {

    e.preventDefault();

    setMsg(checkMessage, '');

    results.hidden = true;


    const noc =
      document.getElementById('checkNoc').value.trim();

    const region =
      document.getElementById('checkRegion').value;


    if (!validNoc(noc)) {
      return setMsg(
        checkMessage,
        'Please enter a valid 5-digit NOC code.',
        'error'
      );
    }


    if (!region) {
      return setMsg(
        checkMessage,
        'Please select a region.',
        'error'
      );
    }


    const btn =
      checkForm.querySelector('button');

    btn.disabled = true;


    try {

      let rows = [];


      if (db) {

        const { data, error } =
          await db
            .from('eoi_profiles')
            .select('eoi_score')
            .eq('noc_code', noc)
            .eq('region', region)
            .order(
              'eoi_score',
              { ascending: false }
            )
            .limit(500);


        if (error) {
          throw error;
        }

        rows = data || [];

      } else {

        rows =
          localRows()
            .filter(
              r =>
                r.noc_code === noc &&
                r.region === region
            )
            .map(
              r => ({
                eoi_score: r.eoi_score
              })
            )
            .sort(
              (a, b) =>
                b.eoi_score - a.eoi_score
            );

      }


      render(
        rows,
        noc,
        region
      );


    } catch (err) {

      setMsg(
        checkMessage,
        'Could not load shared scores. Please try again.',
        'error'
      );

      console.error(err);

    } finally {

      btn.disabled = false;

    }
  });


  /* ==========================================
     RENDER SEARCH RESULTS
     ========================================== */

  function render(rows, noc, region) {

    results.hidden = false;


    profileCount.textContent =
      `${rows.length} profile${rows.length === 1 ? '' : 's'}`;


    resultLabel.textContent =
      `NOC ${noc} · ${region}`;


    scoreChips.innerHTML = '';

    distribution.innerHTML = '';


    if (!rows.length) {

      scoreChips.innerHTML =
        '<span style="color:#65758c">No scores have been shared yet.</span>';

      return;
    }


    rows
      .slice(0, 30)
      .forEach(r => {

        const s =
          document.createElement('span');

        s.className = 'chip';

        s.textContent =
          r.eoi_score;

        scoreChips.appendChild(s);

      });


    if (rows.length > 30) {

      const more =
        document.createElement('span');

      more.className =
        'chip';

      more.textContent =
        `+${rows.length - 30} more`;

      scoreChips.appendChild(more);

    }


    const buckets =
      new Map();


    for (const r of rows) {

      const start =
        Math.floor(
          r.eoi_score / 10
        ) * 10;

      const key =
        `${start}-${start + 9}`;

      buckets.set(
        key,
        (buckets.get(key) || 0) + 1
      );

    }


    const entries =
      [...buckets.entries()]
        .sort(
          (a, b) =>
            parseInt(b[0]) -
            parseInt(a[0])
        );


    const max =
      Math.max(
        ...entries.map(
          ([, c]) => c
        )
      );


    entries.forEach(
      ([label, count]) => {

        const row =
          document.createElement('div');

        row.className =
          'dist-row';


        row.innerHTML = `
          <span>${label}</span>

          <div class="bar-track">

            <div
              class="bar"
              style="width:${Math.round(
                count / max * 100
              )}%"
            ></div>

          </div>

          <strong>
            ${count}
          </strong>
        `;


        distribution.appendChild(row);

      }
    );
  }


  /* ==========================================
     COMMUNITY COUNTS
     ========================================== */

  async function loadCommunityCounts() {

    try {

      let rows = [];


      if (db) {

        const { data, error } =
          await db
            .from('eoi_profiles')
            .select('eoi_score');


        if (error) {
          throw error;
        }


        rows =
          data || [];

      } else {

        rows =
          localRows();

      }


      if (totalCommunityCount) {

        totalCommunityCount.textContent =
          `${rows.length} community ${
            rows.length === 1
              ? 'submission'
              : 'submissions'
          }`;

      }


      if (!communityScoreCounts) {
        return;
      }


      communityScoreCounts.innerHTML = '';


      if (!rows.length) {

        communityScoreCounts.innerHTML =
          '<span style="color:#65758c">No scores shared yet.</span>';

        return;
      }


      const counts =
        new Map();


      for (const row of rows) {

        const score =
          Number(
            row.eoi_score
          );


        counts.set(
          score,
          (counts.get(score) || 0) + 1
        );

      }


      [...counts.entries()]
        .sort(
          (a, b) =>
            b[0] - a[0]
        )
        .forEach(
          ([score, count]) => {

            const chip =
              document.createElement('span');


            chip.className =
              'chip';


            chip.textContent =
              `${score} · ${count} ${
                count === 1
                  ? 'member'
                  : 'members'
              }`;


            communityScoreCounts.appendChild(
              chip
            );

          }
        );


    } catch (err) {

      if (totalCommunityCount) {
        totalCommunityCount.textContent =
          'Community scores';
      }

      console.error(err);

    }
  }


  loadCommunityCounts();

})();
