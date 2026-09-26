import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

async function runUploadE2ETest() {
  console.log('=== RUNNING REAL UPLOADED MP4 END-TO-END PIPELINE TEST ===\n');

  // Step 1: Create a real test MP4 video with real audio and video frames
  const testMp4Path = path.resolve(process.cwd(), 'projects', 'test_e2e_real_upload.mp4');
  console.log('Step 1: Generating real source MP4 video using FFmpeg...');
  const ffGen = spawnSync('ffmpeg', [
    '-y',
    '-f', 'lavfi', '-i', 'testsrc=duration=6:size=1280x720:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    testMp4Path
  ], { encoding: 'utf-8' });

  if (ffGen.status !== 0 || !fs.existsSync(testMp4Path)) {
    throw new Error(`Failed to create test MP4: ${ffGen.stderr}`);
  }
  const fileSize = fs.statSync(testMp4Path).size;
  console.log(`✓ Real MP4 created: ${testMp4Path} (${Math.round(fileSize / 1024)} KB)\n`);

  // Step 2: Upload MP4 via HTTP POST /api/projects/upload
  console.log('Step 2: Uploading MP4 file to /api/projects/upload...');
  const formData = new FormData();
  const fileBytes = fs.readFileSync(testMp4Path);
  const blob = new Blob([fileBytes], { type: 'video/mp4' });
  formData.append('video', blob, 'test_e2e_real_upload.mp4');
  formData.append('title', 'E2E Real Uploaded Video');

  const uploadRes = await fetch('http://127.0.0.1:3000/api/projects/upload', {
    method: 'POST',
    body: formData
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload failed: ${uploadRes.status} ${errText}`);
  }

  const uploadData = await uploadRes.json();
  const project = uploadData.project;
  console.log(`✓ Upload successful!`);
  console.log(`  Project ID: ${project.id}`);
  console.log(`  Source Type: ${project.sourceType}`);
  console.log(`  Source Path: ${project.sourcePath}`);
  console.log(`  File exists on disk: ${fs.existsSync(project.sourcePath)}\n`);

  if (!fs.existsSync(project.sourcePath)) {
    throw new Error(`Uploaded file missing from target source path: ${project.sourcePath}`);
  }

  // Step 3: Job Creation / Dispatch via POST /api/projects/:id/analyze
  console.log(`Step 3: Triggering pipeline analysis for project ${project.id}...`);
  const analyzeRes = await fetch(`http://127.0.0.1:3000/api/projects/${project.id}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userPrompt: 'Find high interest educational moments',
      campaignProfileId: 'general_creator'
    })
  });

  if (!analyzeRes.ok) {
    const errText = await analyzeRes.text();
    throw new Error(`Analyze call failed: ${analyzeRes.status} ${errText}`);
  }

  const analyzeData = await analyzeRes.json();
  const jobId = analyzeData.jobId;
  console.log(`✓ Job dispatched with ID: ${jobId}\n`);

  // Step 4: Poll pipeline progress across all stages
  console.log('Step 4: Monitoring real-time pipeline stages & progress transitions...');
  const stagesSeen = new Set<string>();
  let lastProgress = -1;
  let finalJob: any = null;

  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 800));
    const jobRes = await fetch(`http://127.0.0.1:3000/api/jobs/${jobId}`);
    if (!jobRes.ok) continue;

    const data = await jobRes.json();
    const job = data.job;
    finalJob = job;

    if (!stagesSeen.has(job.state)) {
      stagesSeen.add(job.state);
      console.log(`  → Transitioned to stage: [${job.state}] (${job.progressPercent}%) - ${job.currentStep}`);
    } else if (job.progressPercent !== lastProgress) {
      console.log(`    Progress: ${job.progressPercent}% - ${job.currentStep}`);
    }
    lastProgress = job.progressPercent;

    if (job.state === 'READY_FOR_REVIEW' || job.state === 'COMPLETED' || job.state === 'FAILED') {
      break;
    }
  }

  if (!finalJob || (finalJob.state !== 'READY_FOR_REVIEW' && finalJob.state !== 'COMPLETED')) {
    throw new Error(`Pipeline did not complete successfully. Final state: ${finalJob?.state}, error: ${finalJob?.error}`);
  }

  console.log('\n✓ Pipeline analysis completed successfully!');
  console.log(`  All stages reached: ${Array.from(stagesSeen).join(' -> ')}\n`);

  // Step 5: Verify candidates discovered
  const projDetailsRes = await fetch(`http://127.0.0.1:3000/api/projects/${project.id}`);
  const projDetails = await projDetailsRes.json();
  const candidates = projDetails.candidates || [];
  console.log(`Step 5: Inspecting candidate discovery...`);
  console.log(`✓ Candidates discovered: ${candidates.length}`);

  if (candidates.length === 0) {
    throw new Error('No candidate clips were generated.');
  }

  const clipToRender = candidates[0];
  console.log(`  Candidate 0 bounds: ${clipToRender.startTime}s - ${clipToRender.endTime}s (duration: ${clipToRender.duration}s)\n`);

  // Step 6: Render clip to 9:16 vertical MP4
  console.log(`Step 6: Rendering candidate clip ${clipToRender.id} to 9:16 vertical MP4...`);
  const renderRes = await fetch(`http://127.0.0.1:3000/api/projects/${project.id}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clipConfig: {
        clipId: clipToRender.id,
        startTime: clipToRender.startTime,
        endTime: Math.min(clipToRender.endTime, clipToRender.startTime + 4.0),
        captionStyle: 'BOLD',
        hookText: 'REAL UPLOADED CLIP TEST',
        burnCaptions: true,
        words: [
          { word: 'REAL', start: clipToRender.startTime + 0.2, end: clipToRender.startTime + 0.8 },
          { word: 'UPLOAD', start: clipToRender.startTime + 0.9, end: clipToRender.startTime + 1.5 },
          { word: 'SUCCESS', start: clipToRender.startTime + 1.6, end: clipToRender.startTime + 2.5 }
        ]
      }
    })
  });

  if (!renderRes.ok) {
    const errText = await renderRes.text();
    throw new Error(`Render call failed: ${renderRes.status} ${errText}`);
  }

  const renderData = await renderRes.json();
  const renderJobId = renderData.jobId;
  console.log(`✓ Render job created: ${renderJobId}`);

  // Step 7: Poll render completion
  let finalRenderJob: any = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((r) => setTimeout(r, 600));
    const rRes = await fetch(`http://127.0.0.1:3000/api/jobs/${renderJobId}`);
    if (!rRes.ok) continue;

    const data = await rRes.json();
    finalRenderJob = data.job;
    if (finalRenderJob.state === 'COMPLETED' || finalRenderJob.state === 'FAILED') {
      break;
    }
  }

  if (!finalRenderJob || finalRenderJob.state !== 'COMPLETED') {
    throw new Error(`Rendering failed: ${finalRenderJob?.error}`);
  }

  const outputFilename = `clip_${clipToRender.id}_9x16.mp4`;
  const finalOutputPath = path.resolve(process.cwd(), 'projects', project.id, 'renders', outputFilename);
  console.log(`✓ Rendering completed successfully!`);
  console.log(`  Final MP4 output path: ${finalOutputPath}`);
  console.log(`  Final MP4 exists on filesystem: ${fs.existsSync(finalOutputPath)}`);
  console.log(`  Final output file size: ${fs.statSync(finalOutputPath).size} bytes\n`);

  // Step 8: Validate the output video format with ffprobe
  console.log(`Step 8: Validating 9:16 resolution and streams with FFprobe...`);
  const probeProc = spawnSync('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    finalOutputPath
  ], { encoding: 'utf-8' });

  const probeJson = JSON.parse(probeProc.stdout);
  const vStream = probeJson.streams.find((s: any) => s.codec_type === 'video');
  const aStream = probeJson.streams.find((s: any) => s.codec_type === 'audio');

  console.log(`✓ Video Stream: ${vStream.width}x${vStream.height} (Aspect ratio: 9:16 vertical)`);
  console.log(`✓ Video Codec: ${vStream.codec_name}`);
  console.log(`✓ Audio Codec: ${aStream?.codec_name || 'none'}`);
  console.log(`✓ Duration: ${probeJson.format.duration}s`);

  if (vStream.width !== 1080 || vStream.height !== 1920) {
    throw new Error(`Expected 1080x1920 9:16 vertical resolution, got ${vStream.width}x${vStream.height}`);
  }

  console.log('\n=== REAL UPLOADED MP4 END-TO-END TEST PASSED WITH 100% SUCCESS ===\n');
}

runUploadE2ETest().catch((err) => {
  console.error('\n✗ E2E TEST FAILED:', err);
  process.exit(1);
});
