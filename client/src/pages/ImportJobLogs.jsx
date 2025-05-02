import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const ImportJobLogs = () => {
  const [jobLogs, setJobLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobLogs = async () => {
      try {
        console.log("Fetching job logs from database...");

        const { data, error } = await supabase
          .from('job_logs')
          .select('*');

        if (error) throw error;

        setJobLogs(data);
        console.log("Fetched job logs:", data);
      } catch (error) {
        console.error("Error fetching job logs:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobLogs();
  }, []);

  if (loading) return <div>Loading job logs...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Job Logs</h1>
      <ul>
        {jobLogs.map((log) => (
          <li key={log.id}>
            <strong>{log.logDate}</strong> - {log.description}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ImportJobLogs;
