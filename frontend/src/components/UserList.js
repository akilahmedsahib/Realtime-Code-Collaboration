const UserList = ({ users }) => {
    return (
        <div>
            <h4>Users in Room:</h4>
            <ul>
                {users.map((user) => (
                    <li key={user.userID}>{user.username}</li>
                ))}
            </ul>
        </div>
    );
};

export default UserList;
