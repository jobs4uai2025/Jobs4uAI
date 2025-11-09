import { useState, useEffect } from "react";
import { Bookmark, Loader2, Trash2, ExternalLink, MapPin, Briefcase, DollarSign } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { jobService } from "../../services/jobService";
import { toast } from "sonner";

interface SavedJob {
  _id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  employmentType: string;
  experienceLevel: string;
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  applicationUrl: string;
  postedDate: string;
  visaSponsorship: {
    h1b: boolean;
    opt: boolean;
    stemOpt: boolean;
  };
  skillsRequired: string[];
  isUniversityJob: boolean;
  universityName?: string;
  isCampusExclusive?: boolean;
}

export function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingJobId, setRemovingJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      const jobs = await jobService.getBookmarkedJobs();
      setSavedJobs(jobs || []);
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
      toast.error("Failed to load saved jobs");
      setSavedJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (jobId: string) => {
    try {
      setRemovingJobId(jobId);
      await jobService.unbookmarkJob(jobId);
      setSavedJobs((prev) => prev.filter((job) => job._id !== jobId));
      toast.success("Job removed from saved");
    } catch (error) {
      toast.error("Failed to remove job");
    } finally {
      setRemovingJobId(null);
    }
  };

  const formatSalary = (min?: number, max?: number, currency = "USD") => {
    if (!min && !max) return "Not specified";
    const format = (amount: number) => {
      if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`;
      return amount.toString();
    };
    if (min && max) return `$${format(min)} - $${format(max)} ${currency}`;
    if (min) return `From $${format(min)} ${currency}`;
    return `Up to $${format(max)} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const filterJobsByTab = () => {
    switch (activeTab) {
      case "university":
        return savedJobs.filter((job) => job.isUniversityJob);
      case "remote":
        return savedJobs.filter((job) => job.remote);
      case "visa":
        return savedJobs.filter(
          (job) =>
            job.visaSponsorship.h1b ||
            job.visaSponsorship.opt ||
            job.visaSponsorship.stemOpt
        );
      default:
        return savedJobs;
    }
  };

  const filteredJobs = filterJobsByTab();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#10b981] mx-auto" />
          <p className="text-muted-foreground">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Saved Jobs</h1>
        <p className="text-muted-foreground">
          Track and manage your bookmarked job opportunities
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{savedJobs.length}</div>
            <div className="text-sm text-muted-foreground">Total Saved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {savedJobs.filter((j) => j.isUniversityJob).length}
            </div>
            <div className="text-sm text-muted-foreground">University Jobs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {savedJobs.filter((j) => j.remote).length}
            </div>
            <div className="text-sm text-muted-foreground">Remote Jobs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {
                savedJobs.filter(
                  (j) =>
                    j.visaSponsorship.h1b ||
                    j.visaSponsorship.opt ||
                    j.visaSponsorship.stemOpt
                ).length
              }
            </div>
            <div className="text-sm text-muted-foreground">Visa Sponsor</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({savedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="university">
            University ({savedJobs.filter((j) => j.isUniversityJob).length})
          </TabsTrigger>
          <TabsTrigger value="remote">
            Remote ({savedJobs.filter((j) => j.remote).length})
          </TabsTrigger>
          <TabsTrigger value="visa">
            Visa Sponsor (
            {
              savedJobs.filter(
                (j) =>
                  j.visaSponsorship.h1b ||
                  j.visaSponsorship.opt ||
                  j.visaSponsorship.stemOpt
              ).length
            }
            )
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Bookmark className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No saved jobs yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {activeTab === "all"
                    ? "Start saving jobs you're interested in to track them here"
                    : `No ${activeTab} jobs saved yet`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredJobs.map((job) => (
                <Card key={job._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-1 line-clamp-2">
                          {job.title}
                        </CardTitle>
                        <CardDescription className="font-medium">
                          {job.company}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveBookmark(job._id)}
                        disabled={removingJobId === job._id}
                        className="flex-shrink-0"
                      >
                        {removingJobId === job._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Location & Type */}
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span>{job.employmentType.replace("_", " ")}</span>
                      </div>
                    </div>

                    {/* Salary */}
                    {(job.salaryMin || job.salaryMax) && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {formatSalary(
                            job.salaryMin,
                            job.salaryMax,
                            job.salaryCurrency
                          )}
                        </span>
                      </div>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {job.remote && (
                        <Badge variant="secondary" className="text-xs">
                          Remote
                        </Badge>
                      )}
                      {job.visaSponsorship.h1b && (
                        <Badge variant="outline" className="text-xs">
                          H1B
                        </Badge>
                      )}
                      {job.visaSponsorship.opt && (
                        <Badge variant="outline" className="text-xs">
                          OPT
                        </Badge>
                      )}
                      {job.visaSponsorship.stemOpt && (
                        <Badge variant="outline" className="text-xs">
                          STEM OPT
                        </Badge>
                      )}
                      {job.isUniversityJob && (
                        <Badge className="text-xs bg-[#10b981]">
                          University
                        </Badge>
                      )}
                      {job.isCampusExclusive && (
                        <Badge variant="outline" className="text-xs">
                          Campus Exclusive
                        </Badge>
                      )}
                    </div>

                    {/* University Name */}
                    {job.universityName && (
                      <p className="text-sm text-muted-foreground">
                        🎓 {job.universityName}
                      </p>
                    )}

                    {/* Skills */}
                    {job.skillsRequired.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {job.skillsRequired.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-muted rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.skillsRequired.length > 3 && (
                          <span className="text-xs px-2 py-1 text-muted-foreground">
                            +{job.skillsRequired.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Posted Date */}
                    <p className="text-xs text-muted-foreground">
                      Posted {formatDate(job.postedDate)}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(job.applicationUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Apply Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
