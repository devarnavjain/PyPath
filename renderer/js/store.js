const store = {
  currentUser: null,
  theme: 'dark',
};

function setCurrentUser(user) {
  store.currentUser = user;
  console.log(`Selected user: ${user.name}`);
}

export default store;
export { setCurrentUser };
