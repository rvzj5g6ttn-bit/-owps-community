(() => {
  const $ = (id) => document.getElementById(id);
  const calcTab = $('calculatorTab');
  const communityTab = $('communityTab');
  const calcPanel = $('calculatorPanel');
  const communityPanel = $('communityPanel');
  if (!calcTab || !communityTab || !calcPanel || !communityPanel) return;

  function showTab(which) {
    const calc = which === 'calculator';
    calcPanel.hidden = !calc;
    communityPanel.hidden = calc;
    calcTab.classList.toggle('active', calc);
    communityTab.classList.toggle('active', !calc);
    calcTab.setAttribute('aria-selected', String(calc));
    communityTab.setAttribute('aria-selected', String(!calc));
  }
  calcTab.addEventListener('click', () => showTab('calculator'));
  communityTab.addEventListener('click', () => showTab('community'));

  document.querySelectorAll('.calc-section-head').forEach((head) => {
    head.addEventListener('click', () => {
      const section = head.closest('.calc-section');
      const body = section.querySelector('.calc-section-body');
      const open = section.classList.toggle('open');
      body.hidden = !open;
      head.setAttribute('aria-expanded', String(open));
    });
  });

  const val = (id) => Number($(id)?.value || 0);
  function nocScore() {
    const n = $('calcNoc').value.trim();
    if (!/^\d{5}$/.test(n)) {
      $('calcNocHint').textContent = 'Example: PSW NOC 33102';
      return 0;
    }
    const teer = Number(n[1]);
    const cat = Number(n[0]);
    const teerPts = (teer === 0 || teer === 1) ? 9 : (teer === 2 || teer === 3) ? 6 : 0;
    const categoryPoints = {3:10,7:8,2:6,0:4,1:4,4:4,8:4,9:4,5:2,6:2};
    const catPts = categoryPoints[cat] || 0;
    $('calcNocHint').textContent = `TEER ${teer}: ${teerPts} pts · Occupational category ${cat}: ${catPts} pts`;
    return teerPts + catPts;
  }
  function wageScore() {
    const w = Math.max(0, Number($('calcWage').value) || 0);
    const p = w >= 40 ? 15 : w >= 35 ? 12 : w >= 30 ? 10 : w >= 25 ? 8 : w >= 20 ? 5 : 0;
    $('calcWageHint').textContent = `${p} points`;
    return p;
  }
  function educationScore() {
    let high = 0, name = 'None';
    document.querySelectorAll('#calcEducationChoices input:checked').forEach((box) => {
      const p = Number(box.dataset.points);
      if (p > high) { high = p; name = box.dataset.name; }
    });
    $('calcHighestEdu').innerHTML = `Highest education used: <b>${name} — ${high} pts</b>`;
    const canadian = val('calcCanadianEdu');
    return { high, canadian, total: high + canadian };
  }
  function update() {
    const jobExp = val('calcJobExp');
    $('calcOntarioWrap').hidden = jobExp !== 0;
    const employment = nocScore() + wageScore() + (jobExp || val('calcOntarioExp'));
    const earnings = val('calcEarnings');
    const status = val('calcStatus');
    const education = educationScore();
    const language = val('calcClb') + val('calcLanguages');
    const region = val('calcRegion');
    const total = employment + earnings + status + education.total + language + region;
    $('calcEmploymentPts').textContent = `${employment} pts`;
    $('calcEarningsPts').textContent = `${earnings} pts`;
    $('calcStatusPts').textContent = `${status} pts`;
    $('calcEducationPts').textContent = `${education.total} pts`;
    $('calcLanguagePts').textContent = `${language} pts`;
    $('calcRegionPts').textContent = `${region} pts`;
    $('calcTotal').textContent = total;
    $('calcProgress').style.width = `${Math.min(100, total / 130 * 100)}%`;
    $('calcBreakdown').innerHTML = `
      <div><span>Employment</span><b>${employment}</b></div>
      <div><span>Earnings history</span><b>${earnings}</b></div>
      <div><span>Legal status</span><b>${status}</b></div>
      <div><span>Education</span><b>${education.total}</b></div>
      <div><span>Language</span><b>${language}</b></div>
      <div><span>Regionalization</span><b>${region}</b></div>`;
    return total;
  }
  document.querySelectorAll('#calculatorPanel input, #calculatorPanel select').forEach((el) => {
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  });
  $('calcReset').addEventListener('click', () => {
    document.querySelectorAll('#calculatorPanel input[type="checkbox"]').forEach(x => x.checked = false);
    document.querySelectorAll('#calculatorPanel input:not([type="checkbox"])').forEach(x => x.value = '');
    document.querySelectorAll('#calculatorPanel select').forEach(x => x.selectedIndex = 0);
    update();
  });
  $('calcSubmitCommunity').addEventListener('click', () => {
    const total = update();
    $('shareScore').value = total;
    const noc = $('calcNoc').value.trim();
    if (/^\d{5}$/.test(noc)) $('shareNoc').value = noc;
    const regionOption = $('calcRegion').selectedOptions[0];
    if (regionOption?.dataset.community) $('shareRegion').value = regionOption.dataset.community;
    showTab('community');
    const shareCard = $('shareForm').closest('.card');
    shareCard.classList.add('community-focus');
    shareCard.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(() => shareCard.classList.remove('community-focus'), 1300);
  });
  update();
})();
