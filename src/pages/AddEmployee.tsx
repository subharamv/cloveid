import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AddEmployee: React.FC = () => {
    const [name, setName] = useState('');
    const [employee_id, setEmployeeId] = useState('');
    const [branch, setBranch] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [blood_group, setBloodGroup] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let photo_url = null;
        if (photo) {
            const { data, error } = await supabase.storage
                .from('photos')
                .upload(`${Date.now()}_${photo.name}`, photo);

            if (error) {
                console.error('Error uploading photo:', error);
                return;
            }
            photo_url = data?.path;
        }

        const { error } = await supabase.from('employees').insert([
            {
                name,
                employee_id,
                branch,
                email,
                phone,
                blood_group,
                photo: photo_url,
            },
        ]);

        if (error) {
            console.error('Error adding employee:', error);
        } else {
            // Clear form
            setName('');
            setEmployeeId('');
            setBranch('');
            setEmail('');
            setPhone('');
            setBloodGroup('');
            setPhoto(null);
        }
    };

    return (
        <div>
            <h2>Add New Employee</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Employee ID"
                    value={employee_id}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Blood Group"
                    value={blood_group}
                    onChange={(e) => setBloodGroup(e.target.value)}
                />
                <input
                    type="file"
                    onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                />
                <button type="submit">Add Employee</button>
            </form>
        </div>
    );
};

export default AddEmployee;
