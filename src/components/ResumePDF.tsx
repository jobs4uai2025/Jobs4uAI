import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1a1a1a",
  },
  contactInfo: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 15,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 3,
    color: "#1a1a1a",
  },
  experienceItem: {
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  company: {
    fontSize: 11,
    marginBottom: 3,
    color: "#333333",
  },
  dateRange: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 5,
  },
  bulletPoint: {
    fontSize: 10,
    marginLeft: 15,
    marginBottom: 2,
    color: "#333333",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  skillBadge: {
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    marginRight: 5,
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#333333",
  },
});

export interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    location: string;
    responsibilities: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    graduationDate: string;
    gpa?: string;
    location: string;
  }>;
  skills: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    link?: string;
  }>;
}

interface ResumePDFProps {
  resumeData: ResumeData;
}

export function ResumePDF({ resumeData }: ResumePDFProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } =
    resumeData;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{personalInfo.name}</Text>
          <Text style={styles.contactInfo}>
            {personalInfo.email} | {personalInfo.phone} | {personalInfo.location}
            {personalInfo.linkedin && ` | ${personalInfo.linkedin}`}
            {personalInfo.website && ` | ${personalInfo.website}`}
          </Text>
        </View>

        {/* Summary */}
        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        )}

        {/* Experience */}
        {experience && experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experience.map((exp, index) => (
              <View key={index} style={styles.experienceItem}>
                <Text style={styles.jobTitle}>{exp.title}</Text>
                <Text style={styles.company}>
                  {exp.company} | {exp.location}
                </Text>
                <Text style={styles.dateRange}>
                  {exp.startDate} - {exp.endDate || "Present"}
                </Text>
                {exp.responsibilities.map((resp, i) => (
                  <Text key={i} style={styles.bulletPoint}>
                    • {resp}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {education && education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu, index) => (
              <View key={index} style={{ marginBottom: 8 }}>
                <Text style={styles.jobTitle}>{edu.degree}</Text>
                <Text style={styles.company}>
                  {edu.school} | {edu.location}
                </Text>
                <Text style={styles.dateRange}>
                  Graduated: {edu.graduationDate}
                  {edu.gpa && ` | GPA: ${edu.gpa}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.summaryText}>{skills.join(" • ")}</Text>
          </View>
        )}

        {/* Projects */}
        {projects && projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {projects.map((project, index) => (
              <View key={index} style={{ marginBottom: 8 }}>
                <Text style={styles.jobTitle}>{project.name}</Text>
                <Text style={styles.summaryText}>{project.description}</Text>
                <Text style={styles.dateRange}>
                  Technologies: {project.technologies.join(", ")}
                </Text>
                {project.link && (
                  <Text style={styles.dateRange}>Link: {project.link}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {certifications.map((cert, index) => (
              <View key={index} style={{ marginBottom: 5 }}>
                <Text style={styles.jobTitle}>{cert.name}</Text>
                <Text style={styles.dateRange}>
                  {cert.issuer} | {cert.date}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
