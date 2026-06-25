import store, { setCurrentUser } from '../store.js';
import { enterApp } from '../app.js';
import { getAvatarSVG, createAvatarElement } from '../avatars.js';

function createLogo() {
  const logo = document.createElement('div');
  logo.className = 'splash-logo';
  logo.innerHTML = `
    <div class="splash-logo-icon">
      <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1" fill="#0D1117"/>
        <rect x="9" y="1" width="6" height="6" rx="1" fill="#0D1117"/>
        <rect x="1" y="9" width="6" height="6" rx="1" fill="#0D1117"/>
        <rect x="9" y="9" width="6" height="6" rx="1" fill="#0D1117"/>
      </svg>
    </div>
    <div class="splash-logo-title">PyPath</div>
    <div class="splash-logo-tagline">Learn Python. One path at a time.</div>
  `;
  return logo;
}

function createProfileCard(user) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.style.cssText = `
    background: var(--bg-tertiary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    min-width: 160px;
  `;
  card.addEventListener('mouseenter', () => {
    card.style.borderColor = 'var(--border-strong)';
    card.style.background = 'var(--bg-hover)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.borderColor = 'var(--border-default)';
    card.style.background = 'var(--bg-tertiary)';
  });
  card.addEventListener('click', () => {
    enterApp(user);
  });

  const avatar = createAvatarElement(user.avatar_id, 60);
  card.appendChild(avatar);

  const name = document.createElement('div');
  name.style.cssText = `
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: var(--text-md);
    color: var(--text-primary);
  `;
  name.textContent = user.name;
  card.appendChild(name);

  const stats = document.createElement('div');
  stats.style.cssText = `
    display: flex;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    font-family: var(--font-body);
  `;
  stats.innerHTML = `
    <span>${user.xp} XP</span>
    <span>\uD83D\uDD25 ${user.streak}</span>
  `;
  card.appendChild(stats);

  if (user.last_active) {
    const date = document.createElement('div');
    date.style.cssText = `
      font-size: var(--text-xs);
      color: var(--text-tertiary);
      font-family: var(--font-body);
    `;
    date.textContent = `Last active: ${new Date(user.last_active).toLocaleDateString()}`;
    card.appendChild(date);
  }

  return card;
}

function createAddForm(onSubmit) {
  const form = document.createElement('div');
  form.style.cssText = `
    background: var(--bg-tertiary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    max-width: 360px;
    margin: 0 auto;
  `;

  const title = document.createElement('div');
  title.textContent = 'Create Profile';
  title.style.cssText = `
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: var(--text-md);
    color: var(--text-primary);
    margin-bottom: var(--space-4);
  `;
  form.appendChild(title);

  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Name';
  nameLabel.style.cssText = `
    display: block;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-bottom: var(--space-1);
    font-family: var(--font-body);
  `;
  form.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Enter your name...';
  nameInput.style.cssText = `
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background: var(--bg-primary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: var(--text-base);
    outline: none;
    box-sizing: border-box;
  `;
  nameInput.addEventListener('focus', () => {
    nameInput.style.borderColor = 'var(--border-strong)';
  });
  nameInput.addEventListener('blur', () => {
    nameInput.style.borderColor = 'var(--border-default)';
  });
  form.appendChild(nameInput);

  const avatarLabel = document.createElement('div');
  avatarLabel.textContent = 'Choose Avatar';
  avatarLabel.style.cssText = `
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-top: var(--space-4);
    margin-bottom: var(--space-2);
    font-family: var(--font-body);
  `;
  form.appendChild(avatarLabel);

  let selectedAvatar = 1;
  const avatarGrid = document.createElement('div');
  avatarGrid.style.cssText = `
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  `;

  for (let i = 1; i <= 8; i++) {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
    `;
    if (i === selectedAvatar) {
      item.style.outline = '3px solid white';
    }

    const svgEl = document.createElement('div');
    svgEl.innerHTML = getAvatarSVG(i, 52);
    svgEl.style.cssText = `display:inline-flex;border-radius:50%;overflow:hidden;width:52px;height:52px;flex-shrink:0`;
    item.appendChild(svgEl);

    item.addEventListener('click', () => {
      selectedAvatar = i;
      avatarGrid.querySelectorAll('div').forEach((d) => {
        if (d === item) {
          d.style.outline = '3px solid white';
          d.style.outlineOffset = '0px';
        } else {
          d.style.outline = 'none';
        }
      });
    });
    avatarGrid.appendChild(item);
  }
  form.appendChild(avatarGrid);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = `
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-5);
  `;

  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create';
  createBtn.style.cssText = `
    flex: 1;
    padding: var(--space-3) var(--space-4);
    background: var(--accent-green);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-weight: 600;
    font-size: var(--text-sm);
    cursor: pointer;
    transition: opacity var(--transition-fast);
  `;
  createBtn.addEventListener('mouseenter', () => { createBtn.style.opacity = '0.9'; });
  createBtn.addEventListener('mouseleave', () => { createBtn.style.opacity = '1'; });
  createBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.style.borderColor = 'var(--accent-red)';
      return;
    }
    createBtn.disabled = true;
    createBtn.style.opacity = '0.5';
    await onSubmit(name, selectedAvatar);
  });
  btnRow.appendChild(createBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    padding: var(--space-3) var(--space-4);
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    font-family: var(--font-body);
    font-weight: 600;
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  `;
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = 'var(--bg-hover)';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = 'transparent';
  });
  cancelBtn.addEventListener('click', () => {
    onSubmit(null, null);
  });
  btnRow.appendChild(cancelBtn);
  form.appendChild(btnRow);

  return { form, nameInput };
}

async function renderCreateForm(profileArea) {
  const { form } = createAddForm(async (name, avatarId) => {
    if (name === null) { renderSplash('full'); return; }
    try {
      const result = await window.electronAPI.createUser({ name, avatarId });
      if (result.success) {
        enterApp(result.data);
      }
    } catch (e) {
      console.error('Failed to create user:', e);
    }
  });
  profileArea.appendChild(form);
}

function createBackLink(profileArea) {
  const back = document.createElement('a');
  back.textContent = '\u2190 Back to profiles';
  back.style.cssText = `
    display: inline-block;
    margin-bottom: var(--space-5);
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    text-decoration: none;
    font-family: var(--font-body);
    transition: color var(--transition-fast);
  `;
  back.addEventListener('mouseenter', () => { back.style.color = 'var(--text-primary)'; });
  back.addEventListener('mouseleave', () => { back.style.color = 'var(--text-secondary)'; });
  back.addEventListener('click', () => renderSplash('full'));
  return back;
}

export async function renderSplash(mode = 'full') {
  const appEl = document.getElementById('js-app');
  if (!appEl) return;

  appEl.innerHTML = '';

  const container = document.createElement('div');
  container.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    box-sizing: border-box;
    overflow-y: auto;
  `;

  container.appendChild(createLogo());

  const profileArea = document.createElement('div');
  profileArea.style.cssText = `
    width: 100%;
    max-width: 640px;
  `;

  if (mode === 'create-only') {
    const backLink = createBackLink(profileArea);
    profileArea.appendChild(backLink);
    await renderCreateForm(profileArea);
    container.appendChild(profileArea);
    appEl.appendChild(container);
    return;
  }

  let users = [];
  try {
    const result = await window.electronAPI.getUsers();
    if (result.success) {
      users = result.data;
    }
  } catch (e) {
    console.error('Failed to load users:', e);
  }

  if (users.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      text-align: center;
      color: var(--text-secondary);
      font-family: var(--font-body);
      font-size: var(--text-base);
      margin-bottom: var(--space-6);
    `;
    empty.textContent = 'No profiles yet. Create your first one!';
    profileArea.appendChild(empty);

    await renderCreateForm(profileArea);
  } else {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      justify-content: center;
      margin-bottom: var(--space-6);
    `;

    users.forEach((user) => {
      grid.appendChild(createProfileCard(user));
    });
    profileArea.appendChild(grid);

    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Profile';
    addBtn.style.cssText = `
      display: block;
      margin: 0 auto;
      padding: var(--space-3) var(--space-6);
      background: transparent;
      color: var(--accent-green);
      border: 1px solid var(--accent-green);
      border-radius: var(--radius-md);
      font-family: var(--font-body);
      font-weight: 600;
      font-size: var(--text-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    `;
    addBtn.addEventListener('mouseenter', () => {
      addBtn.style.background = 'var(--accent-green)';
      addBtn.style.color = 'var(--text-inverse)';
    });
    addBtn.addEventListener('mouseleave', () => {
      addBtn.style.background = 'transparent';
      addBtn.style.color = 'var(--accent-green)';
    });
    addBtn.addEventListener('click', () => {
      renderSplash('create-only');
    });
    profileArea.appendChild(addBtn);
  }

  container.appendChild(profileArea);
  appEl.appendChild(container);
}
