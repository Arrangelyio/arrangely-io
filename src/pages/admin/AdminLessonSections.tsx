import { LessonSectionManager } from "@/components/admin/LessonSectionManager";

const AdminLessonSections = () => {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Lesson Section Management</h1>
        <p className="text-muted-foreground mt-2">
          Control which sections appear on the Lessons page and manage featured content
        </p>
      </div>
      
      <LessonSectionManager />
    </div>
  );
};

export default AdminLessonSections;