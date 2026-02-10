import React from 'react';
import { Student } from '@/types';
import { clsx } from 'clsx';
import { UserCircle } from 'lucide-react';

interface StudentListProps {
    students: Student[];
    selectedStudent: Student | null;
    onSelectStudent: (student: Student) => void;
}

export default function StudentList({ students, selectedStudent, onSelectStudent }: StudentListProps) {
    return (
        <div className="w-full md:w-1/3 bg-white border-r border-gray-200 h-full overflow-y-auto">
            <div className="p-4 bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                <h2 className="text-xl font-bold text-gray-800">Chats</h2>
            </div>
            <ul>
                {students.map((student) => (
                    <li
                        key={student.id}
                        onClick={() => onSelectStudent(student)}
                        className={clsx(
                            "flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-colors",
                            selectedStudent?.id === student.id && "bg-gray-100"
                        )}
                    >
                        <div className="mr-3">
                            <UserCircle className="w-10 h-10 text-gray-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-baseline mb-1">
                                <h3 className="text-base font-semibold text-gray-900">{student.name}</h3>
                                <span className="text-xs text-gray-500">Yesterday</span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                                {student.phone_number}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
